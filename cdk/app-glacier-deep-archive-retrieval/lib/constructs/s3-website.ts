/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import { aws_cloudfront, aws_cloudfront_origins, aws_iam, aws_s3, aws_s3_deployment, CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export interface S3WebsiteProps {
  readonly apiUrl: string
}

export class S3Website extends Construct {
  constructor(scope: Construct, id: string, props: S3WebsiteProps) {
    super(scope, id);

    const bucket = new aws_s3.Bucket(this, "bucket", {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true
    });

    const origin_access_identity = new aws_cloudfront.OriginAccessIdentity(this, "OriginAccessIdentity", {
      comment: "Read Access from Cloudfront to bucket"
    });
    bucket.grantRead(origin_access_identity);

    const cf_distribution = new aws_cloudfront.Distribution(this, "CFDistribution", {
      defaultBehavior: {
        origin: new aws_cloudfront_origins.S3Origin(bucket, {
          originAccessIdentity: origin_access_identity
        }),
        cachePolicy: aws_cloudfront.CachePolicy.CACHING_OPTIMIZED
      },
      defaultRootObject: 'index.html',
    })

    const website_deployment = new aws_s3_deployment.BucketDeployment(this, 'DeployWebSiteWithInvalidation', {
      sources: [
        aws_s3_deployment.Source.asset('./website-content')
      ],
      destinationBucket: bucket,
      distribution: cf_distribution,
      distributionPaths: ['/*']
    });

    const config_file_deployment = new cr.AwsCustomResource(this, 'PutConfig', {
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new aws_iam.PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [bucket.arnForObjects('config.json')],
        }),
      ]),
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Bucket: bucket.bucketName,
          Key: 'config.json',
          Body: Stack.of(this).toJsonString({
            API_URL: props.apiUrl
          }),
          ContentType: 'application/json',
          CacheControl: 'max-age=0, no-cache, no-store, must-revalidate',
        },
        physicalResourceId: cr.PhysicalResourceId.of('config'),
      },
    });
    config_file_deployment.node.addDependency(website_deployment)

    new CfnOutput(this, "domain", {
      value: cf_distribution.domainName
    })

    this.domainName = cf_distribution.domainName
  }

  domainName: string
}
