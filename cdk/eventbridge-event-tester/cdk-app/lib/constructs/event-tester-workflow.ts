import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Choice, Condition, IStateMachine, JsonPath, LogLevel, Pass, StateMachine, StateMachineType, Succeed, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import { CallAwsService, EventBridgePutEvents, EventBridgePutEventsEntry } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { IConfig } from "../core/config-provider";
import { IEventBridgeEvent } from "../events/interfaces";
import { EventStatusPollerWorkflow } from "./event-status-poller-wotkflow";

interface IEventTesterWorkflowProps {
    eventBus: IEventBus,
    event: IEventBridgeEvent,
    config: IConfig,
    table: ITable,
    bucket: IBucket
}

export class EventTesterWorkflow extends Construct {

    public readonly stateMachine: IStateMachine;
    public readonly expressStateMachine: IStateMachine;

    constructor(scope: Construct, id: string, props: IEventTesterWorkflowProps) {
        super(scope, id);

        const eventTestWorkflowLogGroup = new LogGroup(this, 'EventTesterLogGroup', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
            logGroupName: `/${props.config.namespace}/event-testing/workflows/${props.event.endpoint()}/event-test/`
        });

        const entries: EventBridgePutEventsEntry[] = [{
            detail: TaskInput.fromJsonPathAt("$.body.detail"),
            detailType: JsonPath.stringAt("$.body.detail-type"),
            source: JsonPath.stringAt("$.body.source"),
            eventBus: props.eventBus
        }];

        const testEventTransformer = new EventBridgePutEvents(this, 'SendEvent', {
            resultSelector: {
                "eventId.$": "$.Entries[0].EventId"
            },
            resultPath: '$.ExecutionContext.event',
            outputPath: '$',
            entries: entries,
        });

        const checkEventStatusWorkflow = new EventStatusPollerWorkflow(this, 'ESPW', {
            config: props.config,
            table: props.table,
            event: props.event,
        });

        const startSyncExecution = new CallAwsService(this, 'PollEventStatus', {
            service: 'sfn',
            action: 'startSyncExecution',
            resultPath: '$.ExecutionContext.eventTestResult',
            outputPath: '$',
            iamAction: 'states:StartSyncExecution',
            iamResources: ['*'], // have to use the '*' here, as eventBus.eventBusArn does not grant enough permissions
            parameters: {
                Input: JsonPath.stringAt("$.ExecutionContext.event"),
                StateMachineArn: checkEventStatusWorkflow.stateMachine.stateMachineArn
            }
        });

        testEventTransformer.next(startSyncExecution);

        const checkStatus = new Choice(this, 'CheckEventStatus', {});
        startSyncExecution.next(checkStatus);

        const reportUnexpectedError = new Pass(this, 'ReportUnexpectedError', {
            parameters: {
                "errorMessage": "An unexpected error has occured. Please make sure you are mapping your eventId in the event transformer.",
                "errorCode": "UNEXPECTED_ERROR",
                "status": "ERROR",
                "eventId": JsonPath.stringAt("$.ExecutionContext.event.eventId"),
                "payload": ""
            },
            outputPath: '$'
        });
        const fail = new Pass(this, 'ExecutionFailed', {
        });
        reportUnexpectedError.next(fail);

        const parseResponse = new Pass(this, 'ProcessTransformedEventResponse', {
            parameters: {
                "event": JsonPath.stringToJson(JsonPath.stringAt("$.ExecutionContext.eventTestResult.Output"))
            },
            resultPath: '$.ExecutionContext'
        });
        const fetchPayload = new CallAwsService(this, "FetchTransformedEventPayload", {
            service: "s3",
            action: "getObject",
            iamAction: 's3:GetObject',
            iamResources: [props.bucket.bucketArn, `${props.bucket.bucketArn}/*`],
            resultPath: '$.ExecutionContext.eventPayload',
            parameters: {
                Bucket: JsonPath.stringAt("$.ExecutionContext.event.payloadBucket"),
                Key: JsonPath.stringAt("$.ExecutionContext.event.payloadObjectKey")
            }
        });
        parseResponse.next(fetchPayload);
        const formatResult = new Pass(this, 'FormatResults', {
            parameters: {
                "errorMessage": JsonPath.stringAt("$.ExecutionContext.event.errorMessage"),
                "errorCode": JsonPath.stringAt("$.ExecutionContext.event.errorCode"),
                "status": JsonPath.stringAt("$.ExecutionContext.event.status"),
                "eventId": JsonPath.stringAt("$.ExecutionContext.event.eventId"),
                "payload": JsonPath.objectAt("$.ExecutionContext.eventPayload.Body")
            },
            outputPath: "$"
        });
        fetchPayload.next(formatResult);
        const success = new Succeed(this, 'ExecutionSucceeded');
        formatResult.next(success);

        const stack = Stack.of(this);

        const buildTestEvent = new Pass(this, "BuildTestEvent", {
            parameters: {
                'detail': JsonPath.objectAt("$.body.detail"),
                'detail-type': JsonPath.stringAt("$.body.detail-type"),
                'source': JsonPath.stringAt("$.body.source"),
                'id': JsonPath.stringAt("$.ExecutionContext.event.eventId"),
                'time': JsonPath.stringAt("$$.State.EnteredTime"),
                'resources': JsonPath.array(JsonPath.stringAt("$$.StateMachine.Id")),
                'account': stack.account,
                'region': stack.region
            },
            resultPath: '$.ExecutionContext.testEvent'
        });

        checkStatus.when(Condition.stringEquals(JsonPath.stringAt("$.ExecutionContext.eventTestResult.Status"), "SUCCEEDED"), parseResponse);
        checkStatus.when(Condition.stringEquals(JsonPath.stringAt("$.ExecutionContext.eventTestResult.Status"), "TIMED_OUT"), buildTestEvent);
        checkStatus.otherwise(reportUnexpectedError);

        const testEventPattern = new CallAwsService(this, 'TestEventPattern', {
            service: 'eventbridge',
            action: 'testEventPattern',
            resultPath: '$.ExecutionContext.eventTestResult.PatternMatches',
            outputPath: '$',
            iamAction: 'events:TestEventPattern',
            iamResources: ['*'], // have to use the '*' here, as eventBus.eventBusArn does not grant enough permissions
            parameters: {
                Event: JsonPath.objectAt("$.ExecutionContext.testEvent"),
                EventPattern: JSON.stringify(props.event.pattern())
            }
        });
        buildTestEvent.next(testEventPattern);

        const patternDoesNotMatch = new Pass(this, 'PatternDoesNotMatch', {
            parameters: {
                "errorMessage": "Event Pattern Does Not Match",
                "errorCode": "PATTERN_DOES_NOT_MATCH",
                "status": "ERROR",
                "eventId": JsonPath.stringAt("$.ExecutionContext.event.eventId"),
                "payload": ""
            },
            outputPath: "$"
        });
        patternDoesNotMatch.next(success);

        const checkTestEventPatternResult = new Choice(this, 'IsEventPatternMatched', {
        });
        testEventPattern.next(checkTestEventPatternResult);
        checkTestEventPatternResult.when(Condition.booleanEquals('$.ExecutionContext.eventTestResult.PatternMatches.Result', false), patternDoesNotMatch);
        checkTestEventPatternResult.otherwise(reportUnexpectedError);

        // Step Functions state machine
        this.stateMachine = new StateMachine(this, 'EventTester', {
            definition: testEventTransformer,
            timeout: Duration.seconds(props.config.eventTesterWorkflowTimeout),
            tracingEnabled: true,
            stateMachineType: StateMachineType.EXPRESS,
            // role: this.role,
            logs: {
                level: LogLevel.ALL,
                destination: eventTestWorkflowLogGroup,
                includeExecutionData: true
            }
        });

        props.table.grantReadData(this.stateMachine);
    }
}