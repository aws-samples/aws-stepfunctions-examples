import { IParameter } from "aws-cdk-lib/aws-ssm";

export class StateDefinition {

  private readonly _configuration: IParameter;

  constructor(configuration: IParameter) {
    this._configuration = configuration;
  }

  public generateDefinition = (): string => {
    return JSON.stringify(
      {
        "StartAt": "FetchConfiguration",
        "States": {
          "FetchConfiguration": {
            "Type": "Task",
            "OutputPath": "$",
            "Next": "GetSecretCrossAccount",
            "Parameters": {
              "Name": `${this._configuration.parameterName}`
            },
            "Resource": "arn:aws:states:::aws-sdk:ssm:getParameter",
            "ResultPath": "$.Configuration",
            "ResultSelector": {
              "Params.$": "States.StringToJson($.Parameter.Value)"
            }
          },
          "GetSecretCrossAccount": {
            "End": true,
            "Type": "Task",
            "OutputPath": "$",
            "ResultSelector": {
              "Secret.$": "States.StringToJson($.Output)"
            },
            "Resource": "arn:aws:states:::aws-sdk:sfn:startSyncExecution",
            "Credentials": {
              "RoleArn.$": "$.Configuration.Params.trustingAccountRoleArn"
            },
            "Parameters": {
              "Input.$": "$.Configuration.Params.secret",
              "StateMachineArn.$": "$.Configuration.Params.trustingAccountWorkflowArn"
            }
          }
        },
        "TimeoutSeconds": 15
      }
    );
  }
}