#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { GlobalRekognitionCustomLabelsRegionalStack } from "../lib/regional-stack";
import { GlobalRekognitionCustomLabelsS3Stack } from "../lib/global-s3-stack";
import * as s3 from "@aws-cdk/aws-s3";
import { GlobalRekognitionCustomLabelsStepFunctionStack } from "../lib/global-stepfunction-stack";
import { GlobalRekognitionCustomLabelsGlobalAcceleratorStack } from "../lib/global-accelerator-stack";

//Amazon Rekognition Custom Labels
//https://docs.aws.amazon.com/general/latest/gr/rekognition.html
/*const serviceRegions = [
  "us-east-1",
  "us-east-2",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
];*/
const serviceRegions = ["us-east-1", "us-east-2"]; // Region with Amazon Rekognition Custom Labels.
const managementRegion = "us-east-1"; // Region to deploy Managment tools.
const maximumModelTrainingTime = 180; // Maximum model training time in minutes.
const reservedConcurrentExecutions = 1; // Reserved Concurrent Executions for call model Lambda.

const app = new cdk.App();

const createRegionalStack = (
  region: string
): {
  region: string;
  stackName: string;
  stack: GlobalRekognitionCustomLabelsRegionalStack;
  trainingDataBucket: s3.Bucket;
  outputBucket: s3.Bucket;
} => {
  const stack = new GlobalRekognitionCustomLabelsRegionalStack(
    app,
    "GlobalRekognitionCustomLabelsRegionalStack-" + region,
    {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: region,
      },
      reservedConcurrentExecutions,
    }
  );
  return {
    region,
    stackName: stack.stackName,
    stack,
    trainingDataBucket: stack.trainingBucket,
    outputBucket: stack.outputBucket,
  };
};

const regionalStacks = serviceRegions.map(createRegionalStack);

const globalRekognitionCustomLabelsS3Stack = new GlobalRekognitionCustomLabelsS3Stack(
  app,
  "GlobalRekognitionCustomLabelsS3Stack-" + managementRegion,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: managementRegion,
    },
    RegionalStacks: regionalStacks,
  }
);
regionalStacks.map((s) =>
  globalRekognitionCustomLabelsS3Stack.addDependency(s.stack)
);

const globalRekognitionCustomLabelsStepFunctionStack = new GlobalRekognitionCustomLabelsStepFunctionStack(
  app,
  "GlobalRekognitionCustomLabelsStepFunctionStack-" + managementRegion,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: managementRegion,
    },
    maximumModelTrainingTime,
    RegionalStacks: regionalStacks,
  }
);
regionalStacks.map((s) =>
  globalRekognitionCustomLabelsStepFunctionStack.addDependency(s.stack)
);

const globalRekognitionCustomLabelsGlobalAcceleratorStack = new GlobalRekognitionCustomLabelsGlobalAcceleratorStack(
  app,
  "globalRekognitionCustomLabelsGlobalAcceleratorStack-" + managementRegion,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: managementRegion,
    },
    RegionalStacks: regionalStacks,
  }
);
regionalStacks.map((s) =>
  globalRekognitionCustomLabelsGlobalAcceleratorStack.addDependency(s.stack)
);
