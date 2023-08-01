# Step Functions Gradual Deployments
These are reference scripts to demonstrate how to do gradual deployments using
AWS Step Functions versions and aliases.

You can use these scripts as inspiration to provision your own gradual
deployments in your CI/CD environments of choice.

The Python example shows how to use an AWS SDK to manage a gradual deployment,
whereas the Bash script shows which AWS CLI commands you can use if you prefer. 
An alternative is to [use CloudFormation for Step Functions Gradual Deployments](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-stepfunctions-statemachinealias.html).

## Python API example
### Prerequisites
Since this is a Python script, you need the Python 3 runtime.

To run [sfndeploy.py](sfndeploy.py), you will need to
[install boto3](https://aws.amazon.com/sdk-for-python/) and
[configure it with your 
credentials](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html#configuration).

tldr; `pip install boto3`

### Script Overview
[sfndeploy.py](sfndeploy.py) is a Python 3 script showing how to use the
[boto3](https://aws.amazon.com/sdk-for-python/) AWS SDK for Python to create
gradual deployments with Step Functions.

This script demonstrates the following deployment strategies:
1. Canary - route a small percentage of traffic to the new version initially,
   then after a validation period where no alarms trigger, switch 100% to that
   new version.
2. Linear (aka Rolling) - route a percentage of traffic, which increases over
   time from 0% to 100%, to the new version, rolling back immediately if any
   alarms trigger.
3. All at Once (aka Blue/Green) - immediately switch 100% to the new version,
   monitor the new version and roll-back automatically to the previous version
   if any alarms trigger. 

### Canary
A Canary strategy deploys in two steps: first a small increment of traffic
routes to the new version, and if there are no problems during the set testing
period it will switch 100% of traffic to the new version.

In this script, use `--increment` to set the initial percentage of traffic to
route to the new version. The `--interval` input specifies for how long (in
seconds) the Canary testing period lasts before switching 100% of traffic to
the new version.

#### Example with defaults
Here is an example showing a Canary deploy using the defaults for increment
(5) and interval (120 seconds):
```
 ./sfndeploy.py --state-machine my-state-machine --region us-east-1 --alias=my-alias --file my-dir/sample.asl.json --publish-revision --strategy canary
```
This example will:
- Upload the `sample.asl.json` file as a new revision of the state machine.
- Publish the state machine definition you just uploaded as the next version.
- Initially point 5% of traffic to this new version, using the `my-alias` alias.
  You can change the percentage of traffic with the `--increment` argument.
- Wait for the default period of 120s You can change this value with the
  `--interval` input.
- Switch 100% of traffic to the new version.

#### Example with values for increment and interval
Now let's switch 30% of traffic to the new version for a test period of
300 seconds. During the 300s the scripts monitors two different alarms - if
any of these alarms trigger the deployment will rollback. If the 300s complete
with no alarms, the script switches 100% of traffic to the new version.

```
./sfndeploy.py --state-machine my-state-machine --region us-east-1 --alias=my-alias --publish-revision --strategy canary --increment 30 --interval 300 --alarms MaxCPU "API Error Breach"
```

Note in this script invocation there the optional file argument isn't specified,
so the `--publish-revision` flag will publish the latest revision of the
state machine to the new version without uploading a new definition.

### Linear
A Linear (or Rolling) deployment strategy gradually increases the percentage of
traffic to the new state machine version from 0% to 100%, in regular increments.

For example, an `--increment 20` with `--interval 600` will increase traffic
by 20% every 600 seconds until the new version receives 100% of traffic.

If you set `--alarms`, the script will monitor the alarms specified during the
deployment until all traffic routes 100% to the new version. If any of the
alarms go into the `ALARM` state during the deployment window, the script will
automatically and immediately rollback to the previous version. You can
configure how often the script polls for alarms with `--alarm-polling`.

```
./sfndeploy.py --state-machine my-state-machine --region us-east-1 --alias=my-alias --file my-dir/sample.asl.json --publish-revision --strategy linear --increment 20 --interval=600 --alarms MaxCPU "API Error Breach" --history-max 11
```

This example will:
- Upload the `sample.asl.json` file as a new revision of the state machine.
- Publish the state machine revision created in the previous step as the next
  version.
- Route 20% of traffic to the new version for 600s.
- Increase the percentage of traffic directed to new new version by 20% each
  600 seconds.
- Monitor the 2 alarms every minute, and rollback automatically if an alarm
  sounds.
- The script will then delete historic versions prior to 11 versions ago.

The `increment` does not need to be a factor of 100. The script will increment
linearly until it reaches 100. The script caps the maximum weight at 100. If,
for example, you set `increment` to 15, the script will increment in seven
steps - six steps of 15 to reach weight 90, and then the final step would only
add ten to reach 100. There wouldn't be any further increments in this case.

### All at Once
An All at Once strategy routes 100% of traffic to the new version immediately,
then monitors for problems duirngs a configurable period. This is useful to
support Blue/Green style deployment where you test the Green version first, then
switch all your production traffic to that version. If any alarms trigger,
the script will automatically rollback the alias to point to the Blue version.

You can set the monitoring period with `--interval` (in seconds).

This deployment strategy ignores the `--increment` input.

```
./sfndeploy.py --state-machine my-state-machine --region us-east-1 --alias=my-alias --file my-dir/sample.asl.json --publish-revision --strategy allatonce --interval=500 --alarms MaxCPU "API Error Breach" --history-max 10
```

This example will:
- Upload the `sample.asl.json` file as a new revision of the state machine.
- Publish the state machine you just uploaded as the next version.
- Point 100% of traffic to this new version, using the alias.
- Monitor the two alarms for 500s, and rollback automatically if an alarm
  sounds.
- If there are no alarms during this period, the deploy was a success.
- The script will then delete historic versions prior to ten versions ago.

If you do not pass the optional `--file` argument, the `--publish-revision` flag
will just publish the latest revision of the state machine to the new version
without first uploading a new definition from a local file.

### CLI inputs
To get CLI input help, pass `--help`:
```
./sfndeploy.py --help
```

Here is a summary of the inputs:
```
❯ ./sfndeploy.py --help
usage: sfndeploy [-h] --state-machine STATE_MACHINE --alias ALIAS --region REGION
                 [--strategy {allatonce,canary,linear}] [--alarms [ALARMS ...]]
                 [--file SM_FILE] [--publish-revision | --no-publish-revision]
                 [--increment INCREMENT] [--interval INTERVAL]
                 [--alarm-polling ALARM_POLLING] [--history-max HISTORY_MAX]
                 [--force | --no-force]

Gradually deploy AWS Step Functions state machines.

options:
  -h, --help            show this help message and exit
  --state-machine STATE_MACHINE
                        Name of the state machine (not ARN).
  --alias ALIAS         Name of alias.
  --region REGION       Region name. e.g 'us-east-1'
  --strategy {allatonce,canary,linear}
                        The type of deployment to do. By default will deploy AllAtOnce.
  --alarms [ALARMS ...]
                        Optional list of CloudWatch alarm names to monitor during
                        deployment.
  --file SM_FILE        Optional path to state machine definition file to deploy. Will
                        upload this file as the latest revision of the state machine. If
                        you don't set this, will use the current latest revision.
  --publish-revision, --no-publish-revision
                        Publish the current revision to the next version.
  --increment INCREMENT
                        The increment for weight increase during deploy strategy, from
                        0-100%. Just input the number, not the % sign.
  --interval INTERVAL   The interval in seconds at which to increase weight during the
                        deploy strategy.
  --alarm-polling ALARM_POLLING
                        Poll alarms at this interval in seconds. Default 60s.
  --history-max HISTORY_MAX
                        Maximum number of versions to keep in history. Will delete
                        versions older than this. Set to 0 to disable (this is the
                        default). There is a 1000 version limit in Step Functions.
  --force, --no-force   Force the deploy to start, even if the alias is not currently
                        pointing 100% at the old version. This may be required to recover
                        from a previous deploy that failed and didn't roll back correctly.
                        This means you might be overwriting an in-progress deploy, or that
                        something went wrong in a previous deploy. Be careful when
                        combining with publish_revision - if you just rerun the script you
                        might force publish a previously uploaded revision without
                        testing.
```

### Version History Deletion
Step Functions limits the number of versions per state machine to 1000. As you
release new versions of a state machine, the older versions remain in the
state machine. This can be useful because you might need to rollback to a
previous version.

To avoid the the build-up of historic versions to reach the limit of 1000, you
need to trim your version history by deleting older versions once you are sure
that you do not need them anymore.

This script provides an automatic version history deletion mechanism that runs
after a deploy completed. You enable this with the `--history-max` argument.
The script will delete any versions prior to `n` versions ago, where `n` is the
number you pass to `history-max`.

For example, if you pass `--history-max 5`, the script will only keep five
versions and delete any versions prior to that.

Carefully consider when a previous version is ready for deletion - you might
need to rollback to it or to refer to it for auditing purposes. Once you
delete a state machine version, it is gone forever.

### Alarm Polling Frequency
By default, the script polls for alarms every 60 seconds. This is because many
AWS services only have an alarm granularity of 60s.

You can set the polling frequency with the `--alarm-polling argument`.
For example, set `--alarm-polling 23` and the script will poll all the
`--alarms` every 23 seconds.

The alarm polling interval is completely independent from `--interval`, so it
does NOT need to be evenly divisible.

Take care to align how often you poll for alarms with the deployment window
that you set with `--interval`. If `--alarm-polling` is high relative to
`--interval` the deployment window could finish before the script polls the
alarms.

### Script Process Flow
The script takes the following actions:
1. If `--file` specified, upload that file as the new revision for the state
   machine
2. If `--publish-revision` set, publish the latest revision of the state machine
   as the next version. This will become the new version to deploy. If you
   combine this with the `--file` input, this will publish the file you just
   uploaded as the next version.
3. Note that if the script fails later on it will NOT undeploy any revision
   uploaded or promoted to a version in the first two steps.
   See [Cloudformation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-stepfunctions-statemachinealias.html) for provisioning with full rollback.
4. If `--publish-revision` is not set, the most recent published version of the
   state machine will deploy. This is useful if you have some other
   process or tool that updates your state machine definitions, and you just
   want to use this script as a way to switch the alias from the old version to
   that new version.
5. Create the specified alias if it does not exist. If the alias didn't exist,
   route 100% of traffic to the new version and exit the script. This is because
   it would be a first deploy, so there is no rollback possible.
6. Start routing traffic to the alias using the deployment strategy set by
   `--strategy`. (AllAtOnce, Linear, Canary). The `--increment` and `--interval`
   arguments govern how the strategy you select behaves.
7. Monitor any `--alarms` specified during the entire deployment period and
   rollback automatically if any of these go into ALARM state.
8. If deployment completes successfully, keep the number of versions set by
   `history_max` and delete state machine versions prior to that. The default
   value of 0 for `history_max` disables this deletion of old versions, but
   remember there is a limit of 1000 versions per state machine.

### Unit tests
You can run the unit tests for `sfndeploy.py` like this:

```
python -m unittest sfndeploy_test.py
```

## AWS CLI example
This bash script shows how to use AWS CLI commands to do a gradual deployment.

### Prerequisites
To run [sfn-canary-deploy.sh](sfn-canary-deploy.sh), you will need the
[AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
installed and configured.

### CLI Script Overview
[sfn-canary-deploy.sh](sfn-canary-deploy.sh) is a bash script showing how
to use the AWS CLI to create and manage a Canary-style deployment. For
AllAtOnce or Linear deployments, see the Python version above.

The script does the following:
1. Publish the most recent revision as the next version of the state machine if
   `publish_revision` is true. This will become the new live version.
2. If `publish_revision` is false, the most recent published version of the
   state machine will deploy.
3. Create the alias if it doesn’t exist yet. If the alias didn't exist,
   point 100% of traffic for this alias to the new version, then exit the
   script.
4. Update the routing configuration for the alias to direct a small
   percentage of traffic from the previous to the new version. You set this
   canary percentage with `canary_percentage`.
5. Monitor the configurable CloudWatch alarms every 60s by default. If any of
   these alarms trigger, rollback the deployment immediately by pointing 100%
   of traffic to the known-good previous version. Will keep on monitoring the
   alarms every `alarm_polling_interval` in seconds until
   `canary_interval_seconds` have passed.
6. If there were no alarms during the canary interval, shift 100% of traffic to
   the new version. You set this interval with `canary_interval_seconds`.
7. Upon successful deployment, delete any versions older than `history_max`.

## Gradual Deployments from CI/CD tools
Here are some tips to get you started with popular CD platforms:

### Jenkins
You can run your customized Bash or Python on Jenkins by using the `sh`
step in the `Jenkinsfile` to run your custom script.

```
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building..'
            }
        }
        stage('Test') {
            steps {
                echo 'Testing..'
            }
        }
        stage(‘Gradual Deploy') {
            steps {
                sh /path/to/gradual-deploy-script.sh
            }
        }
    }
}
```

You have some options to configure the prequisites: 
- If you want to run your script directly from the Jenkins pipeline, you must
  install and configure your prerequisites on the Jenkins server instance - in
  this case the AWS CLI for the Bash script or Boto3 for the Python script.
- The Jenkins user must have AWS credentials to access the Step Functions
  service.
- If you are using the standard Amazon Machine Image (AMI) as a base for your
  Jenkins installation this already contains the prequisites.
- Alternatively, if you want to use custom Docker images to encapsulate your
  dependencies and scripts, you can use the
  [Docker Pipeline Plugin](https://plugins.jenkins.io/docker-workflow/) and let
  [Jenkins run your scripts inside the container](https://www.jenkins.io/doc/pipeline/tour/hello-world/#python).

### Spinnaker
Use the [Jenkins](https://spinnaker.io/docs/reference/pipeline/stages/#jenkins)
stage or the [Script](https://spinnaker.io/docs/setup/other_config/features/script-stage/)
stage in Spinnaker to run a custom shell or Python script from your pipeline.

With the Script stage, Spinnaker uses Jenkins to sandbox your scripts, so you
need to set up a Jenkins instance in order to use it.

In your Spinnaker deck, select:
- Add Stage.
- Select the `Script` type of stage.
- Under `Command` enter your script invocation.
- Set `Depends On` if there’s a preceding stage that should run before your
  custom script.

Alternatively, you can encapsulate your logic and its dependencies in a
container and execute it with a
[Run Job stage](https://spinnaker.io/docs/guides/user/kubernetes-v2/run-job-manifest/).

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: gradual-deploy
spec:
  backoffLimit: 0
  template:
    spec:
      containers:
        - command:
            - python
            - path/to/my/script.py
          image: 'myrepo/mycontainer:1.2.3'
          name: my-custom-script
      restartPolicy: Never
```

## Warning
Remember that creating and running resources in AWS costs money. Take care to
delete resources when you're done to avoid billing surprises.

All the scripts in this repo are examples that are not meant for production
systems. The scripts here do not clean up or release resources when finished.
Take care & run at your own risk.
