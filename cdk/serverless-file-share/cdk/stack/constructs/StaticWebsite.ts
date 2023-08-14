import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { defaultBucketSettings } from '../helpers/S3Settings';

export class StaticWebsite extends Construct {
  public bucket: s3.Bucket;
  public distribution: cloudfront.CloudFrontWebDistribution;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // S3 bucket
    this.bucket = new s3.Bucket(this, 'website-bucket', defaultBucketSettings);

    // Cloudfront distribution
    this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'website-distribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: this.bucket,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              forwardedValues: {
                queryString: false,
                cookies: { forward: 'none' },
              },
              allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD,
              viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              defaultTtl: cdk.Duration.seconds(0),
              minTtl: cdk.Duration.seconds(0),
              maxTtl: cdk.Duration.seconds(0),
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html',
        },
      ],
      defaultRootObject: 'index.html',
    });

    // Origin access control (OAC)
    const oac = new cloudfront.CfnOriginAccessControl(this, 'website-oac', {
      originAccessControlConfig: {
        name: this.bucket.bucketName,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // Apply OAC to distribution
    const cfnDistribution = this.distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', oac.getAtt('Id'));

    // Add OAC bucket policy to S3 bucket
    const bucketPolicy = new s3.BucketPolicy(this, 'website-bucket-policy', {
      bucket: this.bucket,
    });

    bucketPolicy.document.addStatements(
      // enforce SSL
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:*'],
        principals: [new iam.AnyPrincipal()],
        resources: [this.bucket.bucketArn, this.bucket.arnForObjects('*')],
        conditions: {
          Bool: {
            'aws:SecureTransport': false,
          },
        },
      }),

      // OAC policy - allow read access to cloudfront distribution
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        resources: [this.bucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'aws:SourceArn': cdk.Arn.format(
              {
                service: 'cloudfront',
                resource: 'distribution',
                region: '',
                resourceName: this.distribution.distributionId,
              },
              cdk.Stack.of(this),
            ),
          },
        },
      }),
    );
  }
}
