import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import { CfnOutput, RemovalPolicy, Duration } from "@aws-cdk/core";
import { Bucket, CfnBucket } from "@aws-cdk/aws-s3";
import { Role } from "@aws-cdk/aws-iam";

export interface RegionalStack {
  region: string;
  stackName: string;
  trainingDataBucket: s3.Bucket;
  outputBucket: s3.Bucket;
}
interface GlobalRekognitionCustomLabelsS3StackProps extends cdk.StackProps {
  RegionalStacks: RegionalStack[];
}

export class GlobalRekognitionCustomLabelsS3Stack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: GlobalRekognitionCustomLabelsS3StackProps
  ) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const trainingBucket = new s3.Bucket(this, "TrainingDataBucket", {
      bucketName: "custom-labels-global-" + this.account + this.region,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(1),
        },
      ],
    });

    const crrRole = this.getCrrRole(trainingBucket, props.RegionalStacks);
    const cfnBucket = trainingBucket.node.defaultChild as s3.CfnBucket;
    // Change its properties
    cfnBucket.replicationConfiguration = {
      role: crrRole.roleArn,
      rules: this.getDestinationRules(props.RegionalStacks),
    };
    const outputBucket = new s3.Bucket(this, "outputBucket", {
      bucketName:
        "custom-labels-global-" + this.account + this.region + "-output",
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    outputBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucketAcl"],
        resources: [outputBucket.bucketArn],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );
    outputBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [outputBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
          },
        },
      })
    );

    trainingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucketAcl", "s3:GetBucketLocation"],
        resources: [trainingBucket.bucketArn],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );
    trainingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:GetObjectAcl",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging",
        ],
        resources: [trainingBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );

    new CfnOutput(this, "TrainingDataBucketName", {
      value: trainingBucket.bucketName,
      description: "Training Data Bucket",
    });
    new CfnOutput(this, "GlobalModelBuildStepFunction", {
      value: trainingBucket.bucketName,
      description: "Global Model Build StepFunction",
    });
  }

  getDestinationRules(
    regionalStacks: RegionalStack[]
  ): CfnBucket.ReplicationRuleProperty[] {
    return regionalStacks.map((c, index) => ({
      destination: {
        bucket: c.trainingDataBucket.bucketArn,
      },
      status: "Enabled",
      deleteMarkerReplication: {
        status: "Enabled",
      },
      priority: index,
      filter: {
        prefix: "",
      },
    }));
  }

  getCrrRole(trainingBucket: Bucket, regionalStacks: RegionalStack[]): Role {
    const role = new iam.Role(this, "CrrRole", {
      assumedBy: new iam.ServicePrincipal("s3.amazonaws.com"),
      path: "/service-role/",
    });
    for (let regionalStack of regionalStacks) {
      const distinationRegion = regionalStack.region;
      const regionalBucketArn = regionalStack.trainingDataBucket.bucketArn;

      role.addToPolicy(
        new iam.PolicyStatement({
          resources: [trainingBucket.bucketArn],
          actions: ["s3:GetReplicationConfiguration", "s3:ListBucket"],
        })
      );

      role.addToPolicy(
        new iam.PolicyStatement({
          resources: [trainingBucket.arnForObjects("*")],
          actions: [
            "s3:GetObjectVersion",
            "s3:GetObjectVersionAcl",
            "s3:GetObjectVersionForReplication",
            "s3:GetObjectLegalHold",
            "s3:GetObjectVersionTagging",
            "s3:GetObjectRetention",
          ],
        })
      );

      const targetBucket = s3.Bucket.fromBucketArn(
        this,
        "TargetBucket-" + distinationRegion,
        regionalBucketArn
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          resources: [targetBucket.arnForObjects("*")],
          actions: [
            "s3:ReplicateObject",
            "s3:ReplicateDelete",
            "s3:ReplicateTags",
            "s3:GetObjectVersionTagging",
          ],
        })
      );
    }
    return role;
  }
}
