/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import { Construct } from 'constructs';
import { aws_athena, aws_s3, aws_sam, Stack, RemovalPolicy, Fn, StackProps } from 'aws-cdk-lib';

export class GlacierRetrievalAthenaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const ddbAthena = new DDBAthena(this, 'ddbAthena')
  }
}

class DDBAthena extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const spillBucket = new aws_s3.Bucket(this, 'spillBucket', {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.spillBucketArn = spillBucket.bucketArn

    const outputBucket = new aws_s3.Bucket(this, 'outputBucket', {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.outputBucketArn = outputBucket.bucketArn

    const athenaWorkgroup = new aws_athena.CfnWorkGroup(this, 'workgroup', {
      name: Stack.of(this).stackName + '-workgroup',
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: outputBucket.s3UrlForObject(),
        },
        engineVersion: {
          selectedEngineVersion: 'Athena engine version 2',
        },
      },
    });
    this.athenaWorkGroup = athenaWorkgroup.name

    const functionName = `${Stack.of(this).stackName}-reports`.toLowerCase()

    const connectorApp = new aws_sam.CfnApplication(this, 'ConnectorLambda', {
      location: {
        applicationId: "arn:aws:serverlessrepo:us-east-1:292517598671:applications/AthenaDynamoDBConnector",
        semanticVersion: "2021.42.1"
      },
      parameters: {
        AthenaCatalogName: functionName,
        SpillBucket: spillBucket.bucketName
      }
    })

    const connectorFunction = Fn.ref(connectorApp.logicalId);

    const athenaDataCatalog = new aws_athena.CfnDataCatalog(this, 'matchingReportingDataCatalog', {
      name: Stack.of(this).stackName + '-ddbconnector',
      type: 'LAMBDA',
      parameters: {
        function: `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:${functionName}`
      },
    });
  }

  athenaWorkGroup: string
  spillBucketArn: string
  outputBucketArn: string
}