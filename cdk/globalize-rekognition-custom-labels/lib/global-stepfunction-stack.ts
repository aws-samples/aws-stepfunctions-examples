import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import path = require("path");
import { RegionalStack } from "./global-s3-stack";
import { CreateBuiidModelStepfunctionConstruct } from "./construct/create-build-model-stepfunction";
import { DeleteModelStepfunctionConstruct } from "./construct/delete-model-stepfunction";
import * as sns from "@aws-cdk/aws-sns";
import { StartModelStepfunctionConstruct } from "./construct/start-model-version-stepfunction";
import { StopModelStepfunctionConstruct } from "./construct/stop-model-version-stepfunction";
import { CfnOutput } from "@aws-cdk/core";

export interface RegionalData {
  region: string;
  trainingDataBucket: string;
  outputBucket: string;
}

export interface GlobalRekognitionCustomLabelsStepFunctionProps
  extends cdk.StackProps {
  maximumModelTrainingTime: Number;
  RegionalStacks: RegionalStack[];
}

export class GlobalRekognitionCustomLabelsStepFunctionStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: GlobalRekognitionCustomLabelsStepFunctionProps
  ) {
    super(scope, id, props);
    const buildModelFunctionLayer = new lambda.LayerVersion(
      this,
      "BuildModelFunctionLayer",
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda", "build-model-layer")
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        license: "Apache-2.0",
        description: "A layer to test the L2 construct",
      }
    );
    const buildModelResultTopic = new sns.Topic(this, "BuildModelResultTopic", {
      displayName: "Global Rekognition Custom Labels Topic",
    });

    const regionalData: RegionalData[] = props.RegionalStacks.map((c) => ({
      region: c.region,
      trainingDataBucket: c.trainingDataBucket.bucketName,
      outputBucket: c.outputBucket.bucketName,
    }));
    const createBuiidModelStepfunctionConstruct = new CreateBuiidModelStepfunctionConstruct(
      this,
      "CreateBuiidModelStepfunctionConstruct",
      {
        ...props,
        buildModelFunctionLayer: buildModelFunctionLayer,
        regionalData,
        buildModelResultTopic,
      }
    );
    const deleteModelStepfunctionConstruct = new DeleteModelStepfunctionConstruct(
      this,
      "DeleteModelStepfunctionConstruct",
      {
        ...props,
        buildModelFunctionLayer: buildModelFunctionLayer,
        regionalData,
        buildModelResultTopic,
      }
    );
    const startModelStepfunctionConstruct = new StartModelStepfunctionConstruct(
      this,
      "StartModelStepfunctionConstruct",
      {
        ...props,
        buildModelFunctionLayer: buildModelFunctionLayer,
        regionalData,
        buildModelResultTopic,
      }
    );
    const stopModelStepfunctionConstruct = new StopModelStepfunctionConstruct(
      this,
      "StopModelStepfunctionConstruct",
      {
        ...props,
        buildModelFunctionLayer: buildModelFunctionLayer,
        regionalData,
        buildModelResultTopic,
      }
    );
    new CfnOutput(this, "CreateBuiidModelStepfunction", {
      value: createBuiidModelStepfunctionConstruct.stateMachine.stateMachineArn,
      description: "Create Buiid Model Stepfunction",
    });
    new CfnOutput(this, "DeleteModelStepfunction", {
      value: deleteModelStepfunctionConstruct.stateMachine.stateMachineArn,
      description: "Delete Model Stepfunction",
    });
    new CfnOutput(this, "StartModelStepfunction", {
      value: startModelStepfunctionConstruct.stateMachine.stateMachineArn,
      description: "Start Model Stepfunction",
    });
    new CfnOutput(this, "StopModelStepfunction", {
      value: stopModelStepfunctionConstruct.stateMachine.stateMachineArn,
      description: "Stop Model Stepfunction",
    });
  }
}
