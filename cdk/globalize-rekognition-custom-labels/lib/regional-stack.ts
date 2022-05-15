import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import { CfnOutput, RemovalPolicy, Duration } from "@aws-cdk/core";
import { S3EventSource } from "@aws-cdk/aws-lambda-event-sources";
import * as lambda from "@aws-cdk/aws-lambda";
import * as path from "path";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as targets from "@aws-cdk/aws-elasticloadbalancingv2-targets";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ssm from "@aws-cdk/aws-ssm";

export interface GlobalRekognitionCustomLabelsRegionalStackProps
  extends cdk.StackProps {
  reservedConcurrentExecutions: Number;
}

export class GlobalRekognitionCustomLabelsRegionalStack extends cdk.Stack {
  public readonly trainingBucket: s3.Bucket;
  public readonly outputBucket: s3.Bucket;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: GlobalRekognitionCustomLabelsRegionalStackProps
  ) {
    super(scope, id, props);

    // The code that defines your stack goes here
    this.trainingBucket = new s3.Bucket(this, "TrainingDataBucket", {
      bucketName: "custom-labels" + this.account + "-" + this.region,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(1),
        },
      ],
    });
    this.outputBucket = new s3.Bucket(this, "outputBucket", {
      bucketName:
        "custom-labels" + this.account + "-" + this.region + "-output",
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(1),
        },
      ],
    });
    this.outputBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucketAcl"],
        resources: [this.outputBucket.bucketArn],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );
    this.outputBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [this.outputBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
        conditions: {
          StringEquals: {
            "s3:x-amz-acl": "bucket-owner-full-control",
          },
        },
      })
    );

    this.trainingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetBucketAcl", "s3:GetBucketLocation"],
        resources: [this.trainingBucket.bucketArn],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );
    this.trainingBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:GetObjectAcl",
          "s3:GetObjectVersion",
          "s3:GetObjectTagging",
        ],
        resources: [this.trainingBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("rekognition.amazonaws.com")],
      })
    );

    const processManifestFunctionLayer = new lambda.LayerVersion(
      this,
      "ProcessManifestFunctionLayer",
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda", "process-manifest-layer")
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        license: "Apache-2.0",
        description: "A layer to test the L2 construct",
      }
    );
    const processManifestFunction = new lambda.Function(
      this,
      "ProcessManifestFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda", "process-manifest"),
          { exclude: ["node_modules"] }
        ),
        layers: [processManifestFunctionLayer],
      }
    );

    processManifestFunction.addEventSource(
      new S3EventSource(this.trainingBucket, {
        events: [s3.EventType.OBJECT_CREATED_PUT],
        filters: [{ suffix: ".manifest" }],
      })
    );
    this.trainingBucket.grantReadWrite(processManifestFunction);

    const buildModelFunctionLayer = new lambda.LayerVersion(
      this,
      "BuildModelFunctionLayer",
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda", "build-model-layer")
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        license: "Apache-2.0",
        description: "A layer to test the L2 construct",
      }
    );
    const getModelDetailsFunction = new lambda.Function(
      this,
      "GetModelDetailsFunction",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: "index.lambdaHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda", "get-model-details"),
          { exclude: ["node_modules"] }
        ),
        layers: [buildModelFunctionLayer],
      }
    );
    getModelDetailsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ["*"],
        actions: [
          "rekognition:DescribeProjects",
          "rekognition:DescribeProjectVersions",
        ],
      })
    );
    const callModelLayer = new lambda.LayerVersion(this, "CallModelLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda", "call-model-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      license: "Apache-2.0",
      description: "A layer to test the L2 construct",
    });
    const callModelFunction = new lambda.Function(this, "CallModelFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.lambdaHandler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda", "call-model"),
        { exclude: ["node_modules"] }
      ),
      layers: [callModelLayer],
      timeout: Duration.minutes(3),
      reservedConcurrentExecutions: +props.reservedConcurrentExecutions,
      environment: {
        getModelDetailsFunctionArn: getModelDetailsFunction.functionArn,
      },
    });
    callModelFunction.role!.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonRekognitionReadOnlyAccess")
    );
    getModelDetailsFunction.grantInvoke(callModelFunction);

    const vpc = new ec2.Vpc(this, "VPC", {
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: "Public",
        },
      ],
    });
    const securityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    const lb = new elbv2.ApplicationLoadBalancer(this, "ImageAlb", {
      internetFacing: true,
      vpc,
      securityGroup,
    });
    const listener = lb.addListener("Listener", { port: 80 });
    listener.addTargets("Targets", {
      targets: [new targets.LambdaTarget(callModelFunction)],
      healthCheck: {
        enabled: false,
      },
    });

    const stack = cdk.Stack.of(this);
    new ssm.StringParameter(this, "AlbSecurityGroupIdSSMParam", {
      parameterName: `${stack.stackName}.albSecurityGroupId`,
      description: "The security group Id of ALB",
      stringValue: securityGroup.securityGroupId,
    });

    new ssm.StringParameter(this, "AlbArnSSMParam", {
      parameterName: `${stack.stackName}.albArn`,
      description: "The Arn of ALB",
      stringValue: lb.loadBalancerArn,
    });

    new CfnOutput(this, "TrainingDataBucketName", {
      value: this.trainingBucket.bucketName,
      description: "Training Data Bucket",
    });

    new CfnOutput(this, "OutputDataBucketName", {
      value: this.outputBucket.bucketName,
      description: "Output Data Bucket",
    });
    new CfnOutput(this, "Region", {
      value: this.region!,
      description: "Region",
    });
    new CfnOutput(this, "loadBalancerArn", {
      value: lb.loadBalancerArn,
      description: "loadBalancerArn",
    });
    new CfnOutput(this, "loadBalancerDnsName", {
      value: lb.loadBalancerDnsName,
      description: "loadBalancerDnsName",
    });
  }
}
