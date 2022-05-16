import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Choice, Condition, IStateMachine, JsonPath, LogLevel, Pass, StateMachine, StateMachineType, Wait, WaitTime } from "aws-cdk-lib/aws-stepfunctions";
import { DynamoAttributeValue, DynamoGetItem } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { IConfig } from "../core/config-provider";
import { IEventBridgeEvent } from "../events/interfaces";

interface IEventStatusPollerWorkflowProps {
    config: IConfig,
    table: ITable,
    event: IEventBridgeEvent,
}

export class EventStatusPollerWorkflow extends Construct {

    public readonly stateMachine: IStateMachine;

    constructor(scope: Construct, id: string, props: IEventStatusPollerWorkflowProps) {
        super(scope, id);

        const eventPollerWorkflowLogGroup = new LogGroup(this, 'EventStatusPollerLogGroup', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
            logGroupName: `/${props.config.namespace}/event-testing/workflows/${props.event.endpoint()}/event-status-poller/`
        });

        const pollEventPocessingStatus = new DynamoGetItem(this, 'PollEventProcessingStatus', {
            resultPath: '$.eventProcessingResult',
            outputPath: '$',
            key: { EventId: DynamoAttributeValue.fromString(JsonPath.stringAt("$.eventId")) },
            table: props.table
        });

        const wait = new Wait(this, 'Wait', {
            time: WaitTime.duration(Duration.seconds(1)),
        });
        wait.next(pollEventPocessingStatus);

        const checkStatus = new Choice(this, 'IsEventProcessed', {});
        pollEventPocessingStatus.next(checkStatus);

        checkStatus.when(Condition.isNotPresent("$.eventProcessingResult.Item"), wait);

        const processResult = new Pass(this, 'ProcessResults', {
            parameters: {
                "eventId": JsonPath.stringAt("$.eventId"),
                "status": JsonPath.stringAt("$.eventProcessingResult.Item.Status.S"),
                "payloadBucket": JsonPath.stringAt("$.eventProcessingResult.Item.PayloadBucket.S"),
                "payloadObjectKey": JsonPath.stringAt("$.eventProcessingResult.Item.PayloadObjectKey.S"),
                "errorCode": JsonPath.stringAt("$.eventProcessingResult.Item.ErrorCode.S"),
                "errorMessage": JsonPath.stringAt("$.eventProcessingResult.Item.ErrorMessage.S"),
            },
            outputPath: "$"
        });
        checkStatus.otherwise(processResult);

        this.stateMachine = new StateMachine(this, 'EventStatusPoller', {
            definition: pollEventPocessingStatus,
            timeout: Duration.seconds(props.config.eventStatusPollerWorkflowTimeout),
            tracingEnabled: true,
            // the type has to be EXPRESS, because we are using .startSync Integrations
            stateMachineType: StateMachineType.EXPRESS,
            logs: {
                level: LogLevel.ALL,
                destination: eventPollerWorkflowLogGroup,
                includeExecutionData: true
            }
        });
        props.table.grantReadData(this.stateMachine);
    }
}
