import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Code, Function, IFunction, ILayerVersion, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { ILogGroup, LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface INodejsFuncProps {
    functionPath: string,
    layers: ILayerVersion[],
    env: {[key: string]: string}
}

export class NodejsFunctionAdapter extends Construct {
    public readonly lambda: IFunction;
    public readonly logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: INodejsFuncProps) {
        super(scope, id);

        this.lambda = new Function(this, 'NodejsFunc', {
            code: Code.fromAsset(`./../src/lambdas/${props.functionPath}`),
            handler: 'index.handler',
            runtime: Runtime.NODEJS_16_X,
            timeout: Duration.seconds(15),
            tracing: Tracing.ACTIVE,
            memorySize: 128,
            layers: props.layers,
            environment: props.env
        });

        // we are creating LogGroup separately
        // so that it is deleted on cdk destroy
        this.logGroup = new LogGroup(this, 'LambdaLogGroup', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
            logGroupName: `/aws/lambda/${this.lambda.functionName}`
        });
    }
}
