import { Construct, Duration } from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as lambda from "@aws-cdk/aws-lambda";
import path = require("path");
import * as iam from "@aws-cdk/aws-iam";
import { LayerVersion } from "@aws-cdk/aws-lambda";
import { RegionalStack } from "../global-s3-stack";
import { RegionalData } from "../global-stepfunction-stack";
import { Topic } from "@aws-cdk/aws-sns";

export interface StartModelStepfunctionProps {
  RegionalStacks: RegionalStack[];
  buildModelFunctionLayer: LayerVersion;
  regionalData: RegionalData[];
  buildModelResultTopic: Topic;
}

export class StartModelStepfunctionConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  constructor(
    scope: Construct,
    id: string,
    props: StartModelStepfunctionProps
  ) {
    super(scope, id);
    const getModelDetailsFunction = new lambda.Function(
      this,
      "GetModelDetailsFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda", "get-model-details"),
          { exclude: ["node_modules"] }
        ),
        layers: [props.buildModelFunctionLayer],
      }
    );
    getModelDetailsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: [
          "rekognition:DescribeProjects",
          "rekognition:DescribeProjectVersions",
        ],
      })
    );

    const startModelVersionFunction = new lambda.Function(
      this,
      "StartModelVersionFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda", "start-model-version"),
          { exclude: ["node_modules"] }
        ),
        layers: [props.buildModelFunctionLayer],
      }
    );
    startModelVersionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["rekognition:StartProjectVersion"],
      })
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
    const getModelDetails = new tasks.LambdaInvoke(this, "Get Model Details", {
      lambdaFunction: getModelDetailsFunction,
      inputPath: "$",
      outputPath: "$.Payload",
    });

    const startModelVersion = new tasks.LambdaInvoke(
      this,
      "Start Model Version",
      {
        lambdaFunction: startModelVersionFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );

    const setRegionalData = new sfn.Pass(this, "Set Regional Data", {
      comment: "Set Regional Data",
      result: { value: sfn.Result.fromArray(props.regionalData) },
      resultPath: "$.regions",
    });
    const jobFailed = new sfn.Fail(this, "Start Model Verison Failed", {
      cause: "Project Verison Error.",
      error: "DescribeJob returned FAILED",
    });
    const waitX = new sfn.Wait(this, "Wait 5 minutes", {
      time: sfn.WaitTime.duration(Duration.minutes(5)),
    });
    const getStatus = new tasks.LambdaInvoke(this, "Get Job Status ", {
      lambdaFunction: checkProjectVersionFunction,
      inputPath: "$",
      outputPath: "$.Payload",
    });

    const modelMap = new sfn.Map(this, "Map State", {
      comment: "Parallel Map to create regional model.",
      inputPath: "$",
      parameters: {
        "ProjectName.$": "$.ProjectName",
        "VersionNames.$": "$.VersionNames",
        "MinInferenceUnits.$": "$.MinInferenceUnits",
        "Region.$": "$$.Map.Item.Value.region",
      },
      itemsPath: sfn.JsonPath.stringAt("$.regions.value"),
    });

    const startVersionMap = new sfn.Map(this, "Start Version Map State", {
      comment: "Parallel Map to start regional model versions.",
      inputPath: "$",
      parameters: {
        "ProjectName.$": "$.ProjectName",
        "VersionNames.$": "$.VersionNames",
        "Region.$": "$.Region",
        "MinInferenceUnits.$": "$.MinInferenceUnits",
        "ProjectVersionArns.$": "$.ProjectVersionArns",
        "ProjectArn.$": "$.ProjectArn",
        "ProjectVersionArn.$": "$$.Map.Item.Value",
      },
      itemsPath: sfn.JsonPath.stringAt("$.ProjectVersionArns"),
    });
    const versionStatus = new sfn.Pass(this, "Version Started", {
      comment: "Version Started",
    });
    const pass = new sfn.Pass(this, "Pass", {
      comment: "Pass",
    });
    const completeParallel = new sfn.Pass(
      this,
      "Complete Parallel Start Version",
      {
        comment: "Complete Parallel Start Version",
      }
    );

    const notifyBuildModelCompletedTask = new tasks.SnsPublish(
      this,
      "Notify Global Custom Labels Model Task",
      {
        topic: props.buildModelResultTopic,
        subject: "Global Rekognition Custom Label Start Version Result",
        message: sfn.TaskInput.fromJsonPathAt("$"),
      }
    );

    const startVersionTasks = startModelVersion
      .next(waitX)
      .next(getStatus)
      .next(
        new sfn.Choice(this, "Start Version Complete?")
          .when(sfn.Condition.stringEquals("$.Status", "FAILED"), jobFailed)
          .when(
            sfn.Condition.numberGreaterThanEquals("$.Counter", 50),
            jobFailed
          )
          .when(
            sfn.Condition.stringEquals("$.Status", "RUNNING"),
            versionStatus
          )
          .otherwise(waitX)
      );

    startVersionMap.iterator(startVersionTasks);

    const parallel = new sfn.Parallel(this, "Parallel Start Model Version", {
      outputPath: "$.[0]",
    });
    parallel.branch(pass);
    parallel.branch(startVersionMap);
    parallel.next(completeParallel);

    const regionalTasks = getModelDetails.next(parallel);

    modelMap.iterator(regionalTasks);
    const startModelVersionDefinition = setRegionalData
      .next(modelMap)
      .next(notifyBuildModelCompletedTask);

    this.stateMachine = new sfn.StateMachine(
      this,
      "StartGlobalCustomLabelsModelVersionStateMachine",
      {
        stateMachineName: "StartGlobalCustomLabelsModelVersionStateMachine",
        definition: startModelVersionDefinition,
        timeout: Duration.hours(12),
      }
    );
  }
}
