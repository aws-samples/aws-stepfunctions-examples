import { aws_events_targets, Duration, RemovalPolicy } from "aws-cdk-lib";
import { EventPattern, IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { ILogGroup, LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { IConfig } from "../core/config-provider";
import { IEventBridgeEvent, ITestableEvent } from "../events/interfaces";

interface IEventRuleWithCloudWatchLogDestinationProps {
    config: IConfig,
    eventBus: IEventBus,
    event: IEventBridgeEvent
}

export class EventRuleWithCloudWatchLogDestination extends Construct {

    public readonly logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: IEventRuleWithCloudWatchLogDestinationProps) {
        super(scope, id);

        this.logGroup = new LogGroup(this, 'CatchAllEventDestinationLogGroup', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
            logGroupName: `/${props.config.namespace}/event-testing/events/${props.event.endpoint()}/`
        });

        const cwTarget = new aws_events_targets.CloudWatchLogGroup(this.logGroup, {
            retryAttempts: 2,
            maxEventAge: Duration.hours(1)
        });

        // Catch ALL event pattern
        const eventPattern : EventPattern = {
             "version": ["0"] 
        };

        const rule = new Rule(this, 'CatchAllRule', {
            eventBus: props.eventBus,
            eventPattern: eventPattern,
            targets: [cwTarget],
            enabled: true,
        });
    }
}
