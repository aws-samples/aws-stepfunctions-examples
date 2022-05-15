import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import { CfnOutput } from "@aws-cdk/core";
import globalaccelerator = require("@aws-cdk/aws-globalaccelerator");
import ga_endpoints = require("@aws-cdk/aws-globalaccelerator-endpoints");
import elbv2 = require("@aws-cdk/aws-elasticloadbalancingv2");
import * as cr from "@aws-cdk/custom-resources";

export interface RegionalStack {
  region: string;
  stackName: string;
  trainingDataBucket: s3.Bucket;
  outputBucket: s3.Bucket;
}
interface GlobalRekognitionCustomLabelsGlobalAcceleratorStackProps
  extends cdk.StackProps {
  RegionalStacks: RegionalStack[];
}

export class GlobalRekognitionCustomLabelsGlobalAcceleratorStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: GlobalRekognitionCustomLabelsGlobalAcceleratorStackProps
  ) {
    super(scope, id, props);

    const accelerator = new globalaccelerator.Accelerator(this, "Accelerator", {
      acceleratorName: "CustomLabelsGlobalaccelerator",
    });
    const listener = accelerator.addListener("Listener", {
      portRanges: [{ fromPort: 80 }],
    });

    const albs = props.RegionalStacks.map((c) => this.getAlb(this, c));

    albs.map((c) =>
      listener.addEndpointGroup("Group-" + c.region, {
        endpoints: [new ga_endpoints.ApplicationLoadBalancerEndpoint(c.alb)],
      })
    );

    new CfnOutput(this, "GlobalAccelerator", {
      value: accelerator.dnsName,
      description: "GlobalAccelerator",
    });
  }

  getAlb(stack: cdk.Stack, regionData: RegionalStack) {
    const albParameterArn = stack.formatArn({
      account: stack.account,
      region: regionData.region,
      resource: "parameter",
      resourceName: `${regionData.stackName}.albArn`,
      service: "ssm",
    });

    const albArnCR = new cr.AwsCustomResource(
      this,
      "AlbArnLookup-" + regionData.region,
      {
        onUpdate: {
          // will also be called for a CREATE event
          service: "SSM",
          action: "getParameter",
          parameters: {
            Name: `${regionData.stackName}.albArn`,
          },
          region: regionData.region,
          physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [albParameterArn],
        }),
      }
    );
    const securityGroupIdParameterArn = stack.formatArn({
      account: stack.account,
      region: regionData.region,
      resource: "parameter",
      resourceName: `${regionData.stackName}.albSecurityGroupId`,
      service: "ssm",
    });

    const securityGroupIdArnCR = new cr.AwsCustomResource(
      this,
      "AlbSecurityGroupIdLookup-" + regionData.region,
      {
        onUpdate: {
          // will also be called for a CREATE event
          service: "SSM",
          action: "getParameter",
          parameters: {
            Name: `${regionData.stackName}.albSecurityGroupId`,
          },
          region: regionData.region,
          physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: [securityGroupIdParameterArn],
        }),
      }
    );

    const alb = elbv2.ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(
      this,
      "ALB-" + regionData.region,
      {
        loadBalancerArn: albArnCR.getResponseField("Parameter.Value"),
        securityGroupId: securityGroupIdArnCR.getResponseField(
          "Parameter.Value"
        ),
      }
    );
    return {
      region: regionData.region,
      alb,
    };
  }
}
