#!/usr/bin/env python3
"""Create gradual deployment of an AWS Step Functions state machine.

Uses an Alias to deploy a new version of state machine, with one of the
following deployment strategies:
- All At Once (aka blue/green)
- Canary
- Linear

You can set a configurable monitoring period during which the script will
check CloudWatch alarms and roll-back to the previous version automatically
if any of the alarms sound.

If you're just getting started, scroll down to the main() function to get your
bearings.

You can run this script directly from the CLI like this:
./sfndeploy.py --state-machine my-state-machine --region us-east-1 --alias=my-alias --strategy allatonce --interval=10 --alarms alarm1 "alarm name with a space"

"""
from __future__ import annotations
from abc import ABC, abstractmethod
import argparse
import os
import sys
import time
from typing import Union

import boto3

stepfunctions = boto3.client('stepfunctions')


PathType = Union[str, bytes, os.PathLike]


class VersionManager():
    """Manage State Machine version & releases with aliases."""
    sts = boto3.client('sts')

    def __init__(self,
                 state_machine_name: str,
                 region: str,
                 account_id: str) -> None:
        """Use the create() factory to create an instance easily."""
        self.state_machine_arn = f'arn:aws:states:{region}:{account_id}:stateMachine:{state_machine_name}'

    @classmethod
    def create(cls, state_machine_name: str, region: str) -> VersionManager:
        """Create an instance of this class."""
        account_id = VersionManager.sts.get_caller_identity()['Account']

        return cls(state_machine_name=state_machine_name,
                   region=region,
                   account_id=account_id)

    def create_alias(self, name: str, version_arn: str) -> None:
        """Create alias and point 100% traffic to version_arn."""
        print(
            f"Alias {name} not found. Creating it now and pointing " +
            "100% traffic to it...")

        new_alias = stepfunctions.create_state_machine_alias(
            name=name,
            routingConfiguration=[
                {'stateMachineVersionArn': version_arn,
                 'weight': 100}
            ]
        )

        print(
            f"Created new alias {new_alias['stateMachineAliasArn']}, " +
            "routing 100% of traffic to state machine version " +
            f"{version_arn}.\n" +
            "Since this is the 1st version for this alias, no rollback possible.")

    def get_latest_published_version(self) -> str | None:
        """Get the arn of the latest published version of the state machine.

        Returns:
            Arn of the latest published version, or None if state machine does
            not have any published versions.
        """
        versions_response = stepfunctions.list_state_machine_versions(
            stateMachineArn=self.state_machine_arn)

        # key exists even if state machine has no published versions - value []
        version_arns = versions_response['stateMachineVersions']

        if not version_arns:
            return None

        # versions list is in descending order
        return version_arns[0]['stateMachineVersionArn']

    def get_new_version_arn(self, publish_revision: bool) -> str:
        """Get the latest version for this state machine."""
        if publish_revision:
            print("Publishing current revision to new version...")
            # promote the current revision to a published version
            new_version = stepfunctions.publish_state_machine_version(
                stateMachineArn=self.state_machine_arn)

            new_version_arn = new_version['stateMachineVersionArn']

            print("Current revision published as next version.")
        else:
            new_version_arn = self.get_latest_published_version()

            if not new_version_arn:
                raise Exception(
                    "There is no published version for "
                    f"{self.state_machine_arn}. You need at least one " +
                    "published version to create an alias.")

        print(f"New state machine version to release is {new_version_arn}")
        return new_version_arn

    def get_old_version_arn(self, alias: dict) -> str | None:
        """Get the version arn with 100% weight."""
        old_version_arn: str | None = None

        for routing in alias['routingConfiguration']:
            # sfn api enforces that sum of weights == 100
            if routing['weight'] == 100:
                old_version_arn = routing['stateMachineVersionArn']
                print("Old state machine version that is still live " +
                      f"is {old_version_arn}")
                break

        return old_version_arn

    def delete_old_versions(self, history_max=500) -> None:
        """Delete versions older prior to history_max versions ago."""
        if history_max == 0:
            print("Version History pruning disabled.")
            return

        if history_max < 3:
            ValueError(f"history_max must be > 2. This is the least amount " +
                       "of version history you need to be able to roll back " +
                       "in the future.")

        versions_response = stepfunctions.list_state_machine_versions(
            stateMachineArn=self.state_machine_arn,
            maxResults=1000)

        # key exists even if state machine has no published versions - value []
        version_arns = versions_response['stateMachineVersions']

        if len(version_arns) > history_max:
            print(
                f"Deleting version history older than {history_max} " +
                "versions ago...")

            # versions list in descending order
            for i, version in enumerate(version_arns):
                if i > history_max:
                    version_arn = version['stateMachineVersionArn']
                    stepfunctions.delete_state_machine_version(
                        stateMachineVersionArn=version_arn)
                    print(f"Deleted old version {version_arn}")
        else:
            print(
                f"{len(version_arns)} state machines in version history. " +
                "No version history deletion history necessary, because " +
                f"{history_max=}.")

    def switch_to_new_version(self,
                              alias_name: str,
                              deployer: DeployStrategy,
                              alarm_checker: AlarmChecker,
                              publish_revision: bool = True,
                              history_max: int = 500,
                              force: bool = False) -> None:
        """Deploy gradually from previous state machine version to new version.

        Args:
            alias_name (str): Short name of the alias.
            deployer (DeployStrategy): Shift traffic with this deploy strategy.
            alarmchecker (AlarmChecker): Alarms to monitor during
                                         deploy.
            publish_revision (bool): Default True. Publish latest revision to
                                     new version.
            history_max (int): Default 500. Delete versions prior to history
                               max from version history upon successful deploy.
            force (bool): Default False. Force update to alias routing config
                          even when the current configuration is still in a
                          transitional state and does not have a 100% routing.
        """
        state_machine_arn = self.state_machine_arn

        alias_arn = f'{state_machine_arn}:{alias_name}'

        if alarm_checker.has_alarms():
            alarm_checker.verify()
            print(f"Will monitor {alarm_checker.alarm_names} during deploy.")
        else:
            print("No alarms to monitor during deploy.")

        # find out where the new version to-be is, so can switch traffic to it
        new_version_arn = self.get_new_version_arn(publish_revision)

        # if there is an existing alias, find the current live version from it
        try:
            alias = stepfunctions.describe_state_machine_alias(
                stateMachineAliasArn=alias_arn)
            print(f"Alias {alias_arn} already exists.")
            print("Current routing configuration is: " +
                  f"{alias['routingConfiguration']}")
        except stepfunctions.exceptions.ResourceNotFound:
            self.create_alias(alias_name, new_version_arn)
            # done here, because new alias already receiving 100% traffic
            print("Done.")
            return

        old_version_arn = self.get_old_version_arn(alias)

        if not old_version_arn:
            msg = (f"Alias {alias_arn} does not have a routing config entry" +
                   "with 100 % of the traffic.")
            print(msg)

            if force:
                print(
                    "Force override is True. Will force update to routing " +
                    "config for alias to point 100% to new version.")

                stepfunctions.update_state_machine_alias(
                    stateMachineAliasArn=alias_arn,
                    routingConfiguration=[
                        {'stateMachineVersionArn': new_version_arn,
                         'weight': 100}])

                print(f"Alias {alias_arn} now pointing 100% to version " +
                      "{new_version_arn}.")
                print("Done")
                return
            else:
                err = (
                    f"{msg}\nThis means there might be a deploy already in "
                    "progress, so not starting another deploy at this time.")
                raise Exception(err)

        if old_version_arn == new_version_arn:
            print(
                f"The alias {alias_arn} already points to {old_version_arn}. " +
                f"No update necessary.")
            return

        print(f"Deploying {alias_arn}, shifting from {old_version_arn} to " +
              f"{new_version_arn}")

        alias = Alias(alias_arn=alias_arn,
                      new_version_arn=new_version_arn,
                      old_version_arn=old_version_arn)

        deployer.deploy(alias, alarm_checker)

        self.delete_old_versions(history_max)

        print("Done.")

    def upload_revision(self, revision_file_path: PathType) -> None:
        """Upload the file as the latest revision of the state machine."""
        with open(revision_file_path) as file:
            stepfunctions.update_state_machine(
                stateMachineArn=self.state_machine_arn,
                definition=file.read())
            print(
                f"Uploaded {revision_file_path} as latest revision " +
                f"for {self.state_machine_arn}")


class AlarmChecker():
    """Monitor alarms during deployment window.

    Attributes:
        alarm_names (list[str]): List of alarm names to monitor.
        poll_interval (int): Check alarms at this interval in seconds.
    """
    cloudwatch = boto3.client('cloudwatch')

    def __init__(self,
                 alarm_names: list[str] | None,
                 poll_interval: int = 60,
                 raise_err_on_rollback: bool = True) -> None:
        self.alarm_names: list[str] | None = alarm_names
        self.poll_interval: int = poll_interval
        self.raise_err_on_rollback: bool = raise_err_on_rollback

    def check_alarms(self, alias: Alias, duration: int) -> None:
        """Monitor alarms for duration, rollback if alarm condition."""
        if not self.alarm_names:
            print(f"No alarm names to monitor. Sleeping for {duration}s.")
            time.sleep(duration)
            return

        interval = self.poll_interval

        if interval > duration:
            print(f"Warning: Alarm checking interval {interval} is greater " +
                  f"than deploy {duration}")

        start = time.monotonic()

        while (time.monotonic() - start) < duration:
            if self.is_alarmed():
                alias.rollback(raise_err=self.raise_err_on_rollback)

            print("Monitoring alarms...no alarms have triggered.")
            time.sleep(interval)

    def has_alarms(self) -> bool:
        """True if there are alarm names to check"""
        return bool(self.alarm_names)

    def is_alarmed(self) -> bool:
        """"Return True if any of the alarms triggered."""
        alarm_response = self.cloudwatch.describe_alarms(
            AlarmNames=self.alarm_names,
            StateValue='ALARM')

        metric = alarm_response.get('MetricAlarms', [])
        composite = alarm_response.get('CompositeAlarms', [])

        is_in_alarm = composite or metric

        if is_in_alarm:
            active_alarms = []
            active_alarms.extend(alarm['AlarmName'] for alarm in metric)
            active_alarms.extend(alarm['AlarmName'] for alarm in composite)

            triggered = ', '.join(active_alarms)
            print(
                f"The following alarms triggered: {triggered}", file=sys.stderr)

        return is_in_alarm

    def verify(self) -> None:
        """Raises error if any alarm_names do not exist on CloudWatch."""
        # This necessary because describe_alarms does not raise err if alarms
        # don't exist.
        alarm_response = self.cloudwatch.describe_alarms(
            AlarmNames=self.alarm_names)

        metric = alarm_response.get('MetricAlarms', [])
        composite = alarm_response.get('CompositeAlarms', [])

        existing_alarms = []
        existing_alarms.extend(alarm['AlarmName'] for alarm in metric)
        existing_alarms.extend(alarm['AlarmName'] for alarm in composite)

        missing = []
        for alarm_name in self.alarm_names:
            if alarm_name not in existing_alarms:
                missing.append(alarm_name)

        if missing:
            raise Exception(f'Alarms {missing} do not exist in CloudWatch.')


class Alias():
    """Alias manages routing configuration from old to new version."""

    def __init__(self,
                 alias_arn: str,
                 new_version_arn: str,
                 old_version_arn: str) -> None:
        self.alias_arn: str = alias_arn
        self.new_version_arn: str = new_version_arn
        self.old_version_arn: str = old_version_arn

    def update_weights(self, old_weight: int, new_weight: int) -> None:
        """Set old version to old_weight, new version to new weight."""
        stepfunctions.update_state_machine_alias(
            stateMachineAliasArn=self.alias_arn,
            routingConfiguration=[
                {'stateMachineVersionArn': self.old_version_arn,
                 'weight': old_weight},
                {'stateMachineVersionArn': self.new_version_arn,
                 'weight': new_weight}])

        print(f"Updated weights for {self.alias_arn}:")
        print(f"old version: {old_weight}, new version: {new_weight}")

    def rollback(self, raise_err: bool = True) -> None:
        """Reset alias routing configuration to point 100% to old version."""
        print("Rolling back...")

        alias_arn = self.alias_arn
        old_version_arn = self.old_version_arn

        stepfunctions.update_state_machine_alias(
            stateMachineAliasArn=alias_arn,
            routingConfiguration=[
                {'stateMachineVersionArn': old_version_arn,
                    'weight': 100}])

        print(f"{old_version_arn} back to receiving 100% traffic.")

        if raise_err:
            raise Exception(
                f"Deployment of new version {self.new_version_arn} failed. "
                "Successfully rolled back alias " +
                f"{alias_arn} to point at old version {old_version_arn}.")

# region Deploy Strategies


class DeployStrategy(ABC):
    """Derive all deploy strategies from me.

    Attributes:
        increment (int): Shift traffic by increment at every interval.
        interval (int): At each interval (in minutes) shift traffic by
                        increment value.
    """

    def __init__(self,
                 increment: int,
                 interval: int) -> None:
        if increment < 1:
            raise ValueError("increment must be >1.")
        if increment > 100:
            raise ValueError("increment must be <=100.")

        self.increment = increment
        self.interval = interval

    @abstractmethod
    def deploy(self, alias: Alias, alarm_checker: AlarmChecker) -> None:
        pass


class Linear(DeployStrategy):
    """Rolling deploy that spreads increment evenly over duration."""

    def deploy(self, alias: Alias, alarm_checker: AlarmChecker) -> None:
        """Shift traffic from old to new in even linear increments."""
        increment = self.increment
        interval = self.interval
        new_weight = 0

        duration = (100 / increment) * interval

        print("Linear Deploy Strategy beginning...")
        print(f"Will move {increment}% of traffic to new version every "
              f"{interval}s over a total " +
              f"elapsed time of {duration}s")
        while new_weight < 100:
            new_weight = new_weight + increment
            if new_weight > 100:
                new_weight = 100

            old_weight = 100 - new_weight
            alias.update_weights(old_weight=old_weight, new_weight=new_weight)

            # sleep between weight updates happens in check_alarms
            alarm_checker.check_alarms(alias, interval)


class Canary(DeployStrategy):
    """Move traffic in 2 steps - 1st a % for a test interval, and then all."""

    def deploy(self, alias: Alias, alarm_checker: AlarmChecker) -> None:
        """Shift traffic from old to new in 2 increments."""
        increment = self.increment

        print("Canary deploy strategy beginning...")
        print(f"Will move {increment}% of traffic to new version initially " +
              f"and monitor for {self.interval}s.")

        alias.update_weights(old_weight=100-increment, new_weight=increment)

        # monitor alarms for specified period and rollback if appropriate.
        alarm_checker.check_alarms(alias, self.interval)

        if increment == 100:
            print("Canary increment was 100, no second increment required.")
        else:
            print(
                "Canary testing period complete. Switching 100% to new version.")
            alias.update_weights(old_weight=0, new_weight=100)


class AllAtOnce(DeployStrategy):
    """Move 100% traffic to new version immediately (blue/green)."""

    def deploy(self, alias: Alias, alarm_checker: AlarmChecker) -> None:
        """Shift traffic from old to new immediately."""
        print("All At Once deploy strategy beginning...")
        print(f"Will move 100% of traffic to new version immediately " +
              f"and monitor for {self.interval}s.")

        alias.update_weights(old_weight=0, new_weight=100)

        alarm_checker.check_alarms(alias, self.interval)

        print("Alarm monitoring period complete. No issues!")


deploy_strategy_object_mapping = {
    'allatonce': AllAtOnce,
    'canary': Canary,
    'linear': Linear,
}
# endregion Deploy Strategies


# region cli
def get_parsed_args(args):
    """Get cli input args."""
    description = 'Gradually deploy AWS Step Functions state machines.'
    parser = argparse.ArgumentParser(prog='sfndeploy',
                                     description=description,
                                     allow_abbrev=True)

    # required
    parser.add_argument('--state-machine',
                        dest='state_machine',
                        required=True,
                        help="Name of the state machine (not ARN).")
    parser.add_argument('--alias', dest='alias', required=True,
                        help="Name of alias.")
    parser.add_argument('--region', dest='region', required=True,
                        help="Region name. e.g 'us-east-1'")

    # optional
    strategy_help = (
        "The type of deployment to do. By default will deploy AllAtOnce.")
    parser.add_argument('--strategy',
                        dest='strategy',
                        choices=['allatonce', 'canary', 'linear'],
                        type=str.lower,
                        default='allatonce',
                        help=strategy_help)

    alarm_help = (
        "Optional list of CloudWatch alarm names to monitor during deployment.")
    parser.add_argument('--alarms', nargs='*', dest='alarms',
                        help=alarm_help)

    file_help = (
        "Optional path to state machine definition file to deploy.\n" +
        "Will upload this file as the latest revision of the state machine. " +
        "If you don't set this, will use the current latest revision.")

    parser.add_argument('--file', dest='sm_file',
                        help=file_help)

    revision_help = "Publish the current revision to the next version."
    parser.add_argument('--publish-revision',
                        action=argparse.BooleanOptionalAction,
                        dest='publish_revision',
                        help=revision_help)

    increment_help = (
        "The increment for weight increase during deploy strategy, from " +
        "0-100%%. Just input the number, not the %% sign.")
    parser.add_argument('--increment', type=int,
                        default=5,
                        dest='increment',
                        help=increment_help)

    interval_help = (
        "The interval in seconds at which to increase weight during the " +
        "deploy strategy.")

    parser.add_argument('--interval', type=int, default=120, dest='interval',
                        help=interval_help)

    parser.add_argument('--alarm-polling', type=int, default=60,
                        dest='alarm_polling',
                        help=(
                            'Poll alarms at this interval in seconds. ' +
                            'Default 60s.'))

    history_help = (
        "Maximum number of versions to keep in history.\n" +
        "Will delete versions older than this.\n" +
        "Set to 0 to disable (this is the default).\n" +
        "There is a 1000 version limit in Step Functions.")
    parser.add_argument('--history-max', type=int, default=0,
                        dest='history_max',
                        help=history_help
                        )

    force_help = (
        "Force the deploy to start, even if the alias is not currently " +
        "pointing 100%% at the old version. This may be required to recover " +
        "from a previous deploy that failed and didn't roll back correctly.\n" +
        "This means you might be overwriting an in-progress deploy, or that " +
        "something went wrong in a previous deploy.\n" +
        "Be careful when combining with publish_revision - if you just " +
        "rerun the script you might force publish a previously uploaded " +
        "revision without testing.")

    parser.add_argument('--force', action=argparse.BooleanOptionalAction,
                        dest='force',
                        help=force_help)

    args = parser.parse_args(args)

    return args

# endregion cli


def main(args=None) -> int:
    """Entry point for Step Functions Gradual Deployments script."""
    if args is None:
        args = sys.argv[1:]

    parsed_args = get_parsed_args(args)

    strategy_key = parsed_args.strategy.lower()
    strategy_class = deploy_strategy_object_mapping[strategy_key]
    deployer = strategy_class(increment=parsed_args.increment,
                              interval=parsed_args.interval)

    alarm_checker = AlarmChecker(alarm_names=parsed_args.alarms,
                                 poll_interval=parsed_args.interval)

    version_manager = VersionManager.create(
        state_machine_name=parsed_args.state_machine,
        region=parsed_args.region)

    sm_file_path = parsed_args.sm_file
    if sm_file_path:
        version_manager.upload_revision(sm_file_path)

    version_manager.switch_to_new_version(
        alias_name=parsed_args.alias,
        deployer=deployer,
        alarm_checker=alarm_checker,
        publish_revision=parsed_args.publish_revision,
        history_max=parsed_args.history_max,
        force=parsed_args.force)

    return 0


if __name__ == '__main__':
    sys.exit(main())
