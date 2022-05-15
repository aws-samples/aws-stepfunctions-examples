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

export interface DeleteModelStepfunctionProps {
  RegionalStacks: RegionalStack[];
  buildModelFunctionLayer: LayerVersion;
  regionalData: RegionalData[];
  buildModelResultTopic: Topic;
}

export class DeleteModelStepfunctionConstruct extends Construct {
  public readonly stateMachine: sfn.StateMachine;
  constructor(
    scope: Construct,
    id: string,
    props: DeleteModelStepfunctionProps
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

    const deleteModelFunction = new lambda.Function(
      this,
      "DeleteModelFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda", "delete-model"),
          { exclude: ["node_modules"] }
        ),
        layers: [props.buildModelFunctionLayer],
      }
    );
    deleteModelFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["rekognition:DeleteProject"],
      })
    );
    const deleteModelVersionFunction = new lambda.Function(
      this,
      "DeleteModelVersionFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambda", "delete-model-version"),
          { exclude: ["node_modules"] }
        ),
        layers: [props.buildModelFunctionLayer],
      }
    );
    deleteModelVersionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: ["rekognition:DeleteProjectVersion"],
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
    const getModelDetails = new tasks.LambdaInvoke(
      this,
      "Get Version Details",
      {
        lambdaFunction: getModelDetailsFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );
    const getModelDetailsForDeleteProject = new tasks.LambdaInvoke(
      this,
      "Get Project Details",
      {
        lambdaFunction: getModelDetailsFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );

    const deleteModelVersion = new tasks.LambdaInvoke(
      this,
      "Delete Version Version",
      {
        lambdaFunction: deleteModelVersionFunction,
        inputPath: "$",
        outputPath: "$.Payload",
      }
    );
    const deleteProject = new tasks.LambdaInvoke(this, "Delete Project", {
      lambdaFunction: deleteModelFunction,
      inputPath: "$",
      outputPath: "$.Payload",
    });

    const setRegionalData = new sfn.Pass(this, "Set Regional Data", {
      comment: "Set Regional Data",
      result: { value: sfn.Result.fromArray(props.regionalData) },
      resultPath: "$.regions",
    });
    const jobFailed = new sfn.Fail(this, "Delete Verison Failed", {
      cause: "Project Verison Error.",
      error: "DescribeJob returned FAILED",
    });
    const waitX = new sfn.Wait(this, "Wait 5 minutes", {
      time: sfn.WaitTime.duration(Duration.seconds(5)),
    });
    const getStatus = new tasks.LambdaInvoke(this, "Get Job Status ", {
      lambdaFunction: checkProjectVersionFunction,
      inputPath: "$",
      outputPath: "$.Payload",
    });

    const modelMap = new sfn.Map(this, "Map State", {
      comment: "Parallel Map to delete regional model.",
      inputPath: "$",
      parameters: {
        "ProjectName.$": "$.ProjectName",
        "VersionNames.$": "$.VersionNames",
        "Region.$": "$$.Map.Item.Value.region",
      },
      itemsPath: sfn.JsonPath.stringAt("$.regions.value"),
    });

    const deleteVersionMap = new sfn.Map(this, "Delete Version Map State", {
      comment: "Parallel Map to delete regional model versions.",
      inputPath: "$",
      parameters: {
        "ProjectName.$": "$.ProjectName",
        "VersionNames.$": "$.VersionNames",
        "Region.$": "$.Region",
        "ProjectVersionArns.$": "$.ProjectVersionArns",
        "ProjectArn.$": "$.ProjectArn",
        "ProjectVersionArn.$": "$$.Map.Item.Value",
      },
      itemsPath: sfn.JsonPath.stringAt("$.ProjectVersionArns"),
    });
    const versionStatus = new sfn.Pass(this, "Version Deleted", {
      comment: "Version Deleted",
    });

    const startRegionalTask = new sfn.Parallel(this, "Start Regional Task", {
      comment: "Start Regional Task",
    });
    const pass = new sfn.Pass(this, "Pass", {
      comment: "Pass",
    });
    const keepProject = new sfn.Pass(this, "Keep Project", {
      comment: "Keep Project",
    });
    const completeParallel = new sfn.Pass(
      this,
      "Complete Parallel Delete Version",
      {
        comment: "Complete Parallel Delete Version",
        outputPath: "$[0]",
      }
    );

    const notifyBuildModelCompletedTask = new tasks.SnsPublish(
      this,
      "Notify Global Custom Labels Model Task",
      {
        topic: props.buildModelResultTopic,
        subject: "Global Rekognition Custom Label Model Delete Result",
        message: sfn.TaskInput.fromJsonPathAt("$"),
      }
    );

    const deleteVersionTasks = deleteModelVersion
      .next(waitX)
      .next(getStatus)
      .next(
        new sfn.Choice(this, "Delete Version Complete?")
          .when(sfn.Condition.stringEquals("$.Status", "FAILED"), jobFailed)
          .when(
            sfn.Condition.numberGreaterThanEquals("$.Counter", 50),
            jobFailed
          )
          .when(
            sfn.Condition.stringEquals("$.Status", "DELETED"),
            versionStatus
          )
          .when(
            sfn.Condition.stringEquals("$.Status", "NO VERSION"),
            versionStatus
          )
          .otherwise(waitX)
      );

    deleteVersionMap.iterator(deleteVersionTasks);

    completeParallel.next(
      new sfn.Choice(this, "Delete Project?")
        .when(
          sfn.Condition.isNotPresent("$.VersionNames[0]"),
          getModelDetailsForDeleteProject.next(deleteProject)
        )
        .otherwise(keepProject)
    );

    startRegionalTask.next(completeParallel);
    const regionalTasks = startRegionalTask
      .branch(pass)
      .branch(getModelDetails.next(deleteVersionMap));

    modelMap.iterator(regionalTasks);
    const deleteModelDefinition = setRegionalData
      .next(modelMap)
      .next(notifyBuildModelCompletedTask);

    this.stateMachine = new sfn.StateMachine(
      this,
      "DeteleGlobalCustomLabelsModelStateMachine",
      {
        stateMachineName: "DeleteGlobalCustomLabelsModelStateMachine",
        definition: deleteModelDefinition,
        timeout: Duration.hours(12),
      }
    );
  }
}
