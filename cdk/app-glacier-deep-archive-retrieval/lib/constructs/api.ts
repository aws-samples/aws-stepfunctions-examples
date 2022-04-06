/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import { aws_apigateway, aws_iam, aws_lambda, aws_s3, CfnOutput } from "aws-cdk-lib";
import { Code } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { StepFunctionRetrieval } from "./stepfunction-retrieval";

export interface ApiProps {
  readonly dataBucket: aws_s3.Bucket
  readonly stepfunctionRetrieval: StepFunctionRetrieval
}

export class Api extends Construct {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const list_files_fn = new aws_lambda.Function(this, 'list-files-fn', {
      code: Code.fromAsset('./lib/functions/list-files/'),
      handler: 'list-files.handler',
      runtime: aws_lambda.Runtime.NODEJS_12_X,
      tracing: aws_lambda.Tracing.ACTIVE,
      environment: {
        BUCKET_NAME: props.dataBucket.bucketName
      }
    })
    props.dataBucket.grantRead(list_files_fn)

    const download_fn = new aws_lambda.Function(this, 'download-fn', {
      code: Code.fromAsset('./lib/functions/download/'),
      handler: 'download.handler',
      runtime: aws_lambda.Runtime.NODEJS_12_X,
      tracing: aws_lambda.Tracing.ACTIVE,
      environment: {
        BUCKET_NAME: props.dataBucket.bucketName
      }
    })
    props.dataBucket.grantRead(download_fn)

    const apiGateway = new aws_apigateway.RestApi(this, 'restApi', {})

    const list_files_resource = apiGateway.root.addResource('list-files')
    list_files_resource.addMethod('GET', new aws_apigateway.LambdaIntegration(list_files_fn))

    const download_resource = apiGateway.root.addResource('download')
    download_resource.addMethod('GET', new aws_apigateway.LambdaIntegration(download_fn))

    const initiate_retrieval_role = new aws_iam.Role(this, "initiate-retrieval-role", {
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    initiate_retrieval_role.attachInlinePolicy(
      new aws_iam.Policy(this, "getPolicy", {
        statements: [
          new aws_iam.PolicyStatement({
            actions: [
              "states:StartSyncExecution",
              "states:StartExecution"
            ],
            effect: aws_iam.Effect.ALLOW,
            resources: [
              props.stepfunctionRetrieval.stateMachine.stateMachineArn,
            ],
          }),
          new aws_iam.PolicyStatement({
            actions: [
              "states:DescribeExecution",
            ],
            effect: aws_iam.Effect.ALLOW,
            resources: [
              props.stepfunctionRetrieval.stateMachine.stateMachineArn
            ],
          }),
        ],
      })
    );

    const initiate_retrieval_resource = apiGateway.root.addResource('initiate-retrieval')

    initiate_retrieval_resource.addMethod(
      "POST",
      new aws_apigateway.AwsIntegration({
        service: "states",
        action: "StartSyncExecution",
        integrationHttpMethod: "POST",
        options: {
          credentialsRole: initiate_retrieval_role,
          integrationResponses: [
            {
              statusCode: "200",
              responseParameters: {
                'method.response.header.Access-Control-Allow-Origin': "'*'"
              },
              responseTemplates: {
                "application/json": `{ 
                                    "executionId": "$input.json('executionArn').split(':').get(7)"
                                }`,
              },
            },
          ],
          requestTemplates: {
            "application/json": `{
                            "input": "$util.escapeJavaScript($input.json('$'))",
                            "stateMachineArn": "${props.stepfunctionRetrieval.stateMachine.stateMachineArn}"
                        }`
          },
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": false
            }
          }
        ],
      }
    );

    initiate_retrieval_resource.addCorsPreflight({
      allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      allowMethods: ['POST', 'OPTIONS'],
      allowCredentials: true,
      allowOrigins: ['*'],
    })


    new CfnOutput(this, "url", {
      value: apiGateway.url
    })

    this.url = apiGateway.url
  }

  url: string
}