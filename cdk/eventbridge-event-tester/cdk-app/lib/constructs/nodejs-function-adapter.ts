import { Duration } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, IFunction, ILayerVersion, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Constants } from "../core/constants";

interface INodejsFuncProps {
    functionName: string,
    bucket: IBucket,
    table: ITable,
    layers: ILayerVersion[]
}

export class NodejsFunctionAdapter extends Construct {
    public readonly lambda: IFunction;

    constructor(scope: Construct, id: string, props: INodejsFuncProps) {
        super(scope, id);

        this.lambda = new Function(this, 'NodejsFunc', {
            code: Code.fromAsset(`./../src/lambdas/${props.functionName}`),
            handler: 'index.handler',
            runtime: Runtime.NODEJS_14_X,
            layers: props.layers,
            timeout: Duration.seconds(Constants.Configuration.Timeots.ApiGatewayIntegrationTimeout),
            environment: {
                'EVENTS_BUCKET': props.bucket.bucketName,
                'EVENTS_TRACKING_TABLE': props.table.tableName
            },
            logRetention: RetentionDays.ONE_DAY,
            tracing: Tracing.ACTIVE,
            memorySize: 128
        });

        props.bucket.grantWrite(this.lambda);
        props.table.grantWriteData(this.lambda);
    }
}