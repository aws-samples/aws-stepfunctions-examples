import { aws_events_targets, Duration } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus, IRule, Rule } from "aws-cdk-lib/aws-events";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { Constants } from "../core/constants";
import { IEventBridgeEvent } from "../events/interfaces";
import { NodejsFunctionAdapter } from "./nodejs-function-adapter";

interface IEventRuleWithLambdaDestinationProps {
    dlq: IQueue,
    eventBus: IEventBus,
    event: IEventBridgeEvent,
    bucket: IBucket,
    table: ITable,
    layers: ILayerVersion[]
}

export class EventRuleWithLambdaDestination extends Construct {

    public readonly func: NodejsFunctionAdapter;
    public readonly rule: IRule;

    constructor(scope: Construct, id: string, props: IEventRuleWithLambdaDestinationProps) {
        super(scope, id);

        this.func = new NodejsFunctionAdapter(this, 'EventProcessor', {
            functionName: Constants.Resources.Lambdas.EventTester,
            bucket: props.bucket,
            table: props.table,
            layers: props.layers
        });

        const lambdaTarget = new aws_events_targets.LambdaFunction(this.func.lambda, {
            retryAttempts: 0, // do not retry, do to DLQ right away
            maxEventAge: Duration.hours(1),
            deadLetterQueue: props.dlq,
            event: props.event.transformer()
        });

        this.rule = new Rule(this, 'EventTestingRule', {
            eventBus: props.eventBus,
            eventPattern: props.event.pattern(),
            targets: [lambdaTarget],
            enabled: true
        });
    }
}