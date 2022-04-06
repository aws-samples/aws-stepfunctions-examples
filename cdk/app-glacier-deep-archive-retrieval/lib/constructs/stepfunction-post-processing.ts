/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import {
  aws_dynamodb,
  aws_events,
  aws_events_targets,
  aws_iam,
  aws_lambda, aws_logs,
  aws_s3, aws_stepfunctions,
  aws_stepfunctions_tasks,
  RemovalPolicy,
  Stack
} from "aws-cdk-lib";
import { Code } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface StepFunctionPostProcessingProps {
  readonly dataBucket: aws_s3.Bucket
  readonly metadataTable: aws_dynamodb.Table
  readonly apiUrl: string
}

export class StepFunctionPostProcessing extends Construct {
  constructor(scope: Construct, id: string, props: StepFunctionPostProcessingProps) {
    super(scope, id);

    const calculate_retrieval_cost_fn = new aws_lambda.Function(this, 'calculate-retrieval-cost-fn', {
      code: Code.fromAsset('./lib/functions/calculate-retrieval-cost/'),
      handler: 'calculate-retrieval-cost.handler',
      runtime: aws_lambda.Runtime.NODEJS_14_X,
      tracing: aws_lambda.Tracing.ACTIVE
    })
    calculate_retrieval_cost_fn.addToRolePolicy(new aws_iam.PolicyStatement({
      actions: ['pricing:GetProducts'],
      effect: aws_iam.Effect.ALLOW,
      resources: ['*'],
    }))

    const get_download_url_fn = new aws_lambda.Function(this, 'get-download-url-fn', {
      code: Code.fromAsset('./lib/functions/get-download-url/'),
      handler: 'get-download-url.handler',
      runtime: aws_lambda.Runtime.NODEJS_14_X,
      tracing: aws_lambda.Tracing.ACTIVE,
      environment: {
        API_URL: props.apiUrl
      }
    })

    const sfn_get_restore_metadata = new aws_stepfunctions_tasks.CallAwsService(this, 'Get restore operation metadata', {
      service: 'dynamodb',
      action: 'query',
      parameters: {
        TableName: props.metadataTable.tableName,
        KeyConditionExpression: 'fileKey = :fileKey',
        ExpressionAttributeValues: {
          ':fileKey': {
            'S': aws_stepfunctions.JsonPath.stringAt('$.s3Event.detail.object.key')
          }
        },
        Limit: 1,
        ScanIndexForward: false
      },
      iamResources: [props.metadataTable.tableArn],
      resultSelector: {
        "metadata": aws_stepfunctions.JsonPath.stringAt('$.Items[0]')
      },
      resultPath: aws_stepfunctions.JsonPath.stringAt('$.result')
    })

    const sfn_calculate_costs = new aws_stepfunctions_tasks.LambdaInvoke(this, 'Calculate costs', {
      lambdaFunction: calculate_retrieval_cost_fn,
      payload: aws_stepfunctions.TaskInput.fromObject({
        "fileSize": aws_stepfunctions.JsonPath.numberAt('$.s3Event.detail.object.size'),
        "objectRetrievalTier": aws_stepfunctions.JsonPath.stringAt('$.result.metadata.objectRetrievalTier.S')
      }),
      resultPath: aws_stepfunctions.JsonPath.stringAt('$.result.costs'),
      payloadResponseOnly: true
    })
    sfn_get_restore_metadata.next(sfn_calculate_costs)

    const sfn_update_metadata = new aws_stepfunctions_tasks.DynamoUpdateItem(this, 'Update restore metadata: Add costs', {
      table: props.metadataTable,
      key: { 
        fileKey: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.s3Event.detail.object.key')),
        submittedDate: aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.result.metadata.submittedDate.S')),
      },
      updateExpression: 'SET retrievalCost = :retrieval, dataTransferOutCost = :dataTransfer',
      expressionAttributeValues: {
        ':retrieval': aws_stepfunctions_tasks.DynamoAttributeValue.numberFromString(aws_stepfunctions.JsonPath.stringAt('States.Format(\'{}\', $.result.costs.retrieval)')),
        ':dataTransfer': aws_stepfunctions_tasks.DynamoAttributeValue.numberFromString(aws_stepfunctions.JsonPath.stringAt('States.Format(\'{}\', $.result.costs.dataTransfer)'))
      },
      resultPath: aws_stepfunctions.JsonPath.DISCARD
    })
    sfn_calculate_costs.next(sfn_update_metadata)

    const sfn_get_download_url = new aws_stepfunctions_tasks.LambdaInvoke(this, 'Get download url', {
      lambdaFunction: get_download_url_fn,
      payload: aws_stepfunctions.TaskInput.fromObject({
        "fileKey": aws_stepfunctions.JsonPath.objectAt('$.s3Event.detail.object.key')
      }),
      resultPath: aws_stepfunctions.JsonPath.stringAt('$.result.downloadUrl'),
      payloadResponseOnly: true
    })
    sfn_update_metadata.next(sfn_get_download_url)

    const sfn_restore_completed = new aws_stepfunctions_tasks.CallAwsService(this, 'Restore object completed', {
      service: 'sesv2',
      action: 'sendEmail',
      parameters: {
        Content: {
          Simple: {
            Body: {
              Html: {
                Data: aws_stepfunctions.JsonPath.format("Dear requester,<br><br>Your requested file has been retrieved successfully and is available to download.<br><br>File: {}<br>Costs for retrieval: $ {}<br>Costs per download: $ {}<br>Download: {}", aws_stepfunctions.JsonPath.stringAt('$.s3Event.detail.object.key'), aws_stepfunctions.JsonPath.stringAt('$.result.costs.retrieval'), aws_stepfunctions.JsonPath.stringAt('$.result.costs.dataTransfer'), aws_stepfunctions.JsonPath.stringAt('$.result.downloadUrl'))
              }
            },
            Subject: {
              Data: "Requested file is ready to download"
            }
          }
        },
        Destination: {
          ToAddresses: aws_stepfunctions.JsonPath.stringAt('States.Array($.result.metadata.requester.S)')
        },
        FromEmailAddress: aws_stepfunctions.JsonPath.format(Stack.of(this).stackName + ' <{}>', aws_stepfunctions.JsonPath.stringAt('$.result.metadata.requester.S'))
      },
      iamResources: ['*'],
      iamAction: 'ses:SendEmail',
      resultPath: aws_stepfunctions.JsonPath.DISCARD,
    })
    sfn_get_download_url.next(sfn_restore_completed)

    this.stateMachine = new aws_stepfunctions.StateMachine(this, 'StateMachine', {
      stateMachineType: aws_stepfunctions.StateMachineType.STANDARD,
      definition: sfn_get_restore_metadata,
      tracingEnabled: true,
      logs: {
        destination: new aws_logs.LogGroup(this, 'logs', { removalPolicy: RemovalPolicy.DESTROY }),
        level: aws_stepfunctions.LogLevel.ALL
      }
    })

    new aws_events.Rule(this, 'invoke-post-processing-rule', {
      eventPattern: {
        source: ["aws.s3"],
        detailType: [
          "Object Restore Completed"
        ],
        detail: {
          bucket: {
            name: [props.dataBucket.bucketName]
          }
        }
      },
      targets: [new aws_events_targets.SfnStateMachine(this.stateMachine, {
        input: aws_events.RuleTargetInput.fromObject({
          's3Event': aws_events.EventField.fromPath('$')
        })
      })]
    })
  }

  stateMachine: aws_stepfunctions.StateMachine
}