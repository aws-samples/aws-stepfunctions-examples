import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { BlockPublicAccess, Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { IConfig } from "../core/config-provider";
import { Constants } from "../core/constants";
import { IEventBridgeEvent } from "../events/interfaces";
import { EventRuleWithCloudWatchLogDestination } from "./event-rule-cw-log-destination";
import { EventRuleWithLambdaDestination } from "./event-rule-lambda-destination";
import { EventTesterWorkflow } from "./event-tester-workflow";
import { LambdaLayerAdapter } from "./lambda-layer-adapter";
import { NodejsFunctionAdapter } from "./nodejs-function-adapter";

interface IEventTrackerProps {
    event: IEventBridgeEvent,
    eventBus: IEventBus,
    config: IConfig
}

export class EventTracker extends Construct {

    public readonly workflow: EventTesterWorkflow;

    constructor(scope: Construct, id: string, props: IEventTrackerProps) {

        super(scope, id);

        const eventsBucket = new Bucket(this, 'TransformedEventPayload', {
            accessControl: BucketAccessControl.PRIVATE,
            autoDeleteObjects: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            removalPolicy: RemovalPolicy.DESTROY
        });

        const eventTrackingTable = new Table(this, 'EventTracking', {
            partitionKey: {
                name: 'EventId',
                type: AttributeType.STRING
            },
            removalPolicy: RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'TimeToLive'
        });

        const layer = new LambdaLayerAdapter(this, 'Utils', {
            layerName: Constants.Resources.Layers.UtilsLayer
        });

        // Event Bus Error handling
        const dlq = new Queue(this, 'EventTesterDlq');
        const errorHandler = new NodejsFunctionAdapter(this, 'ErrorHandler', {
            functionName: Constants.Resources.Lambdas.ErrorHandler,
            bucket: eventsBucket,
            table: eventTrackingTable,
            layers: [layer.layer]
        });
        const eventSource = new SqsEventSource(dlq, {
            batchSize: 1,
            enabled: true,
        });
        errorHandler.lambda.addEventSource(eventSource);

        // used for debugging purposes
        const catchAll = new EventRuleWithCloudWatchLogDestination(this, "ERWCWLD", {
            config: props.config,
            eventBus: props.eventBus,
            event: props.event
        });

        // Event Tester
        const lambdaEventRule = new EventRuleWithLambdaDestination(this, 'ERWLD', {
            bucket: eventsBucket,
            dlq: dlq,
            event: props.event,
            eventBus: props.eventBus,
            table: eventTrackingTable,
            layers: [layer.layer]
        });

        // Event Testing Workflow
        this.workflow = new EventTesterWorkflow(this, 'ETW', {
            eventBus: props.eventBus,
            table: eventTrackingTable,
            config: props.config,
            event: props.event,
            bucket: eventsBucket
        });

        // allow lambda to send the `resume` response to the state machine
        this.workflow.stateMachine.grantTaskResponse(lambdaEventRule.func.lambda);
        this.workflow.stateMachine.grantTaskResponse(errorHandler.lambda);
    }
}