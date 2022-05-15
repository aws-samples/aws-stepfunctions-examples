import { Construct, Duration } from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as lambda from "@aws-cdk/aws-lambda";
import path = require("path");
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import * as iam from "@aws-cdk/aws-iam";

import { LayerVersion } from "@aws-cdk/aws-lambda";
import { RegionalStack } from "../global-s3-stack";
import { RegionalData } from "../global-stepfunction-stack";
import { Topic } from "@aws-cdk/aws-sns";

export interface CreateBuiidModelStepfunctionProps {
  maximumModelTrainingTime: Number;
  RegionalStacks: RegionalStack[];
  buildModelFunctionLayer: LayerVersion;
  regionalData: RegionalData[];
  buildModelResultTopic: Topic;
}

export class CreateBuiidModelStepfunctionConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  constructor(
    scope: Construct,
    id: string,
    props: CreateBuiidModelStepfunctionProps
  ) {
    super(scope, id);
    const buildModelFunction = new lambda.Function(this, "BuildModelFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.lambdaHandler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambda", "build-model"),
        { exclude: ["node_modules"] }
      ),
      layers: [props.buildModelFunctionLayer],
    });

    buildModelFunction.role!.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonRekognitionCustomLabelsFullAccess"
      )
    );
    buildModelFunction.role!.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess")
    );

    const checkProjectVersionFunction = new lambda.Function(
      this,
      "CheckProjectVersionFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda", "check-project-version"),
          { exclude: ["node_modules"] }
        ),
        layers: [props.buildModelFunctionLayer],
      }
    );
    checkProjectVersionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["rekognition:DescribeProjectVersions"],
      })
    );

    const setRegionalData = new sfn.Pass(this, "Set Regional Data", {
      comment: "Set Regional Data",
      result: { value: sfn.Result.fromArray(props.regionalData) },
      resultPath: "$.regions",
    });
    const buildModelMap = new sfn.Map(this, "Map State", {
      comment: "Parallel Map to create regional model.",
      inputPath: "$",
      parameters: {
        "ProjectName.$": "$.ProjectName",
        "ManifestKey.$": "$.ManifestKey",
        "VersionName.$": "$.VersionName",
        "Region.$": "$$.Map.Item.Value.region",
        "TrainingDataBucket.$": "$$.Map.Item.Value.trainingDataBucket",
        "OutputBucket.$": "$$.Map.Item.Value.outputBucket",
      },
      itemsPath: sfn.JsonPath.stringAt("$.regions.value"),
    });
    const jobFailed = new sfn.Fail(this, "Build Model Failed", {
      cause: "Project Verison Error.",
      error: "DescribeJob returned FAILED",
    });
    const waitX = new sfn.Wait(this, "Wait 5 minutes", {
      time: sfn.WaitTime.duration(Duration.minutes(5)),
    });
    const buildModelLambdaTask = new tasks.LambdaInvoke(
      this,
      "Build Model Lambda Task.",
      {
        lambdaFunction: buildModelFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );
    const getStatus = new tasks.LambdaInvoke(this, "Get Job Status", {
      lambdaFunction: checkProjectVersionFunction,
      inputPath: "$",
      outputPath: "$.Payload",
    });
    const finalStatus = new sfn.Pass(this, "Final", {
      comment: "Final Result",
    });

    const regionalTasks = buildModelLambdaTask
      .next(waitX)
      .next(getStatus)
      .next(
        new sfn.Choice(this, "Training Complete?")
          // Look at the "status" field
          .when(sfn.Condition.stringEquals("$.Status", "FAILED"), jobFailed)
          .when(
            sfn.Condition.numberGreaterThanEquals(
              "$.Counter",
              Math.floor(+props.maximumModelTrainingTime / 5)
            ),
            jobFailed
          )
          .when(
            sfn.Condition.stringEquals("$.Status", "TRAINING_COMPLETED"),
            finalStatus
          )
          .otherwise(waitX)
      );
    buildModelMap.iterator(regionalTasks);

    const notifyBuildModelCompletedTask = new tasks.SnsPublish(
      this,
      "Notify Global Custom Labels Model Task",
      {
        topic: props.buildModelResultTopic,
        subject: "Global Rekognition Custom Label Create Version Result",
        message: sfn.TaskInput.fromJsonPathAt("$"),
      }
    );
    const buildModleDefinition = setRegionalData
      .next(buildModelMap)
      .next(notifyBuildModelCompletedTask);
    this.stateMachine = new sfn.StateMachine(
      this,
      "GlobalCustomLabelsModelStateMachine",
      {
        stateMachineName: "BuildGlobalCustomLabelsModelStateMachine",
        definition: buildModleDefinition,
        timeout: Duration.hours(12),
      }
    );
  }
}
