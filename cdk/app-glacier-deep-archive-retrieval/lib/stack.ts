/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import { aws_dynamodb, aws_s3, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api } from './constructs/api';
import { S3Website } from './constructs/s3-website';
import { StepFunctionPostProcessing } from './constructs/stepfunction-post-processing';
import { StepFunctionRetrieval } from './constructs/stepfunction-retrieval';

export class GlacierRetrievalAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dataBucket = new aws_s3.Bucket(this, 'dataBucket', {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    })
    const cfnDataBucket = dataBucket.node.defaultChild as aws_s3.CfnBucket;
    cfnDataBucket.addPropertyOverride('NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled', true);

    const metadataTable = new aws_dynamodb.Table(this, 'metadataTable', {
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'fileKey', type: aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedDate', type: aws_dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY
    })

    const sfn_retrieval = new StepFunctionRetrieval(this, 'sfn-retrieval', {
      dataBucket: dataBucket,
      metadataTable: metadataTable
    })

    const api = new Api(this, 'api', {
      dataBucket: dataBucket,
      stepfunctionRetrieval: sfn_retrieval
    })

    const website = new S3Website(this, 'website', {
      apiUrl: api.url
    })

    const sfn_post_processing = new StepFunctionPostProcessing(this, 'sfn-post-processing', {
      dataBucket: dataBucket,
      metadataTable: metadataTable,
      apiUrl: api.url
    })
  }
}
