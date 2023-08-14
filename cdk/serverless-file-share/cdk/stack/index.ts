import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

import { FileShareAnalytics } from './constructs/FileShareAnalytics';
import { FileShareBackend } from './constructs/FileShareBackend';
import { StaticWebsite } from './constructs/StaticWebsite';

// Check if web build folder exists
const webBuildFolder = path.resolve(__dirname, '../../ui/build');
if (!fs.existsSync(webBuildFolder)) {
  throw new Error('Please build the UI project (npm run build) before deploying this CDK project.');
}

export class ServerlessFileShareStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /*-------------------------------
     * Set up infrastructure
     -------------------------------*/

    // Create static website for UI using S3 and Cloudfront
    const website = new StaticWebsite(this, 'website');

    // Create back end infrastructure (i.e. Step Functions, Lambda, DynamoDB, S3)
    const backend = new FileShareBackend(this, 'backend', {
      stackName: this.stackName,
      region: this.region,
    });

    // Create analytics components (Glue, Athena, QuickSight)
    new FileShareAnalytics(this, 'analytics', {
      account: this.account,
      loggingBucket: backend.loggingBucket,
      analyticsBucket: backend.analyticsBucket,
    });

    /*-------------------------------
     * Deploy static website
     -------------------------------*/

    // Create web config for UI
    const config = {
      Region: this.region,
      CognitoUserPoolId: backend.userPool.userPoolId,
      CognitoUserPoolClientId: backend.userPoolClient.userPoolClientId,
      ApiUrl: backend.api.url,
    };

    // Save web config to SSM Parameter Store
    const webConfig = new ssm.StringParameter(this, 'web-config', {
      stringValue: `window.config = ${JSON.stringify(config)}`,
    });

    // Deploy website files to S3
    new s3deploy.BucketDeployment(this, 'web-deployment', {
      destinationBucket: website.bucket,
      sources: [
        // Deploy build files
        s3deploy.Source.asset(webBuildFolder),

        // Deploy web config
        s3deploy.Source.data('config.js', webConfig.stringValue),
      ],
    });

    /*-------------------------------
     * Outputs
     -------------------------------*/

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'Region',
    });

    new cdk.CfnOutput(this, 'ApiUri', {
      value: backend.api.url,
      description: 'API URL',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: backend.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: backend.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'WebsiteS3BucketURI', {
      value: `s3://${website.bucket.bucketName}`,
      description: 'Website S3 Bucket URI',
    });

    new cdk.CfnOutput(this, 'WebsiteDistributionId', {
      value: website.distribution.distributionId,
      description: 'Website Cloudfront Distribution Id',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${website.distribution.distributionDomainName}`,
      description: 'Website Cloudfront URL',
    });

    new cdk.CfnOutput(this, 'WebConfig', {
      value: webConfig.parameterName,
      description: 'Web Config SSM Parameter',
    });
  }
}
