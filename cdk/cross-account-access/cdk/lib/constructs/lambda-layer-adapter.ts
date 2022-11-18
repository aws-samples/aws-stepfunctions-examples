import { Code, ILayerVersion, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface ILambdaLayerAdapterProps {
    layerName: string,
}

export class LambdaLayerAdapter extends Construct {

    public readonly layer: ILayerVersion;

    constructor(scope: Construct, id: string, props: ILambdaLayerAdapterProps) {
        super(scope, id);

        this.layer = new LayerVersion(this, 'LambdaLayer', {
            code: Code.fromAsset(`./../src/layers/${props.layerName}`),
            compatibleRuntimes: [
                Runtime.NODEJS_14_X,
                Runtime.NODEJS_16_X
            ],
            description: 'Utils for Lambdas'
        });
    }
}