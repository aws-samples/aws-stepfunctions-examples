/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import { aws_dynamodb, aws_logs, aws_s3, aws_stepfunctions, aws_stepfunctions_tasks, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StepFunctionRetrievalProps {
  readonly dataBucket: aws_s3.Bucket
  readonly metadataTable: aws_dynamodb.Table
}

export class StepFunctionRetrieval extends Construct {
  constructor(scope: Construct, id: string, props: StepFunctionRetrievalProps) {
    super(scope, id);

    const sfn_validate_restore_object = new aws_stepfunctions.Choice(this, 'Validate Restore Object Request')

    const sfn_get_object_metadata = new aws_stepfunctions_tasks.CallAwsService(this, 'Get Object Metadata', {
      service: 's3',
      action: 'headObject',
      parameters: {
        Bucket: props.dataBucket.bucketName,
        Key: aws_stepfunctions.JsonPath.stringAt('$.fileKey')
      },
      iamResources: [props.dataBucket.arnForObjects('*')],
      iamAction: 's3:GetObject',
      resultPath: aws_stepfunctions.JsonPath.stringAt('$.result.metadata')
    })

    const sfn_bad_request = new aws_stepfunctions.Fail(this, 'Bad Request', {
      error: "400",
      cause: "Bad Request"
    })

    sfn_validate_restore_object.when(aws_stepfunctions.Condition.and(
      aws_stepfunctions.Condition.isPresent(aws_stepfunctions.JsonPath.stringAt('$.requester')),
      aws_stepfunctions.Condition.isPresent(aws_stepfunctions.JsonPath.stringAt('$.fileKey')),
      aws_stepfunctions.Condition.isPresent(aws_stepfunctions.JsonPath.stringAt('$.requestedForDays')),
      aws_stepfunctions.Condition.or(
        aws_stepfunctions.Condition.stringEquals(aws_stepfunctions.JsonPath.stringAt('$.objectRetrievalTier'), 'Standard'), 
        aws_stepfunctions.Condition.stringEquals(aws_stepfunctions.JsonPath.stringAt('$.objectRetrievalTier'), 'Bulk')
      ),
    ), sfn_get_object_metadata)
    sfn_validate_restore_object.otherwise(sfn_bad_request)
    sfn_get_object_metadata.addCatch(sfn_bad_request)

    const sfn_initiate_restore_object = new aws_stepfunctions_tasks.CallAwsService(this, 'Initiate Restore Object from Deep Archive', {
      service: 's3',
      action: 'restoreObject',
      parameters: {
        Bucket: props.dataBucket.bucketName,
        Key: aws_stepfunctions.JsonPath.stringAt('$.fileKey'),
        RestoreRequest: {
          Days: aws_stepfunctions.JsonPath.numberAt('$.requestedForDays')
        }
      },
      iamResources: [props.dataBucket.arnForObjects('*')],
      resultPath: aws_stepfunctions.JsonPath.DISCARD
    })
    sfn_get_object_metadata.next(sfn_initiate_restore_object)

    const sfn_put_restore_metadata = new aws_stepfunctions_tasks.DynamoPutItem(this, 'Update restore operation metadata', {
      table: props.metadataTable,
      item: {
        "fileKey": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.fileKey')),
        "submittedDate": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$$.Execution.StartTime')),
        "requester": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.requester')),
        "requestedForDays": aws_stepfunctions_tasks.DynamoAttributeValue.numberFromString(aws_stepfunctions.JsonPath.stringAt('States.Format(\'{}\', $.requestedForDays)')),
        "objectRetrievalTier": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.objectRetrievalTier')),
        "contentLength": aws_stepfunctions_tasks.DynamoAttributeValue.numberFromString(aws_stepfunctions.JsonPath.stringAt('States.Format(\'{}\', $.result.metadata.ContentLength)')),
        "contentType": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.result.metadata.ContentType')),
        "storageClass": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.result.metadata.StorageClass')),
        "etag": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$.result.metadata.ETag')),
        "executionName": aws_stepfunctions_tasks.DynamoAttributeValue.fromString(aws_stepfunctions.JsonPath.stringAt('$$.Execution.Name')),
      },
      resultPath: aws_stepfunctions.JsonPath.DISCARD
    })
    sfn_initiate_restore_object.next(sfn_put_restore_metadata)

    const sfn_restore_object_initiated = new aws_stepfunctions_tasks.CallAwsService(this, 'Restore Object Initiated', {
      service: 'sesv2',
      action: 'sendEmail',
      parameters: {
        Content: {
          Simple: {
            Body: {
              Html: {
                Data: aws_stepfunctions.JsonPath.format("Dear requester,<br><br>You have successfully requested the retrieval of the following file from Glacier: {}<br>You will be notified again once the file is available for download.", aws_stepfunctions.JsonPath.stringAt('$.fileKey'))
              }
            },
            Subject: {
              Data: "Restore Object initiated"
            }
          }
        },
        Destination: {
          ToAddresses: aws_stepfunctions.JsonPath.stringAt('States.Array($.requester)')
        },
        FromEmailAddress: aws_stepfunctions.JsonPath.format(Stack.of(this).stackName + ' <{}>', aws_stepfunctions.JsonPath.stringAt('$.requester'))
      },
      iamResources: ['*'],
      iamAction: 'ses:SendEmail',
      resultPath: aws_stepfunctions.JsonPath.DISCARD,
    })
    sfn_put_restore_metadata.next(sfn_restore_object_initiated)

    this.stateMachine = new aws_stepfunctions.StateMachine(this, 'StateMachine', {
      stateMachineType: aws_stepfunctions.StateMachineType.EXPRESS,
      definition: sfn_validate_restore_object,
      tracingEnabled: true,
      logs: {
        destination: new aws_logs.LogGroup(this, 'logs', { removalPolicy: RemovalPolicy.DESTROY }),
        level: aws_stepfunctions.LogLevel.ALL
      }
    });

  }

  stateMachine: aws_stepfunctions.StateMachine
}