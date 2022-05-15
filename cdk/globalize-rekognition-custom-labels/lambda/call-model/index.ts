import { APIGatewayEvent, ALBResult, Context } from "aws-lambda";
import {
  RekognitionClient,
  DetectCustomLabelsCommand,
  DetectCustomLabelsCommandOutput,
} from "@aws-sdk/client-rekognition";

import {
  LambdaClient,
  InvokeCommand,
  InvokeCommandOutput,
} from "@aws-sdk/client-lambda";

import * as parser from "lambda-multipart-parser";

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

let localCache = new Map<string, string>();

export const lambdaHandler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<ALBResult> => {
  console.log(event);
  const result = await parser.parse(event);
  console.log(result.files);

  const key =
    event.queryStringParameters!.ProjectName +
    "-" +
    event.queryStringParameters!.VersionName;
  let projectVersionArn = "";
  if (!localCache.has(key)) {
    const getModelEvent = {
      ProjectName: event.queryStringParameters!.ProjectName,
      VersionNames: [event.queryStringParameters!.VersionName],
      Region: process.env.AWS_REGION,
    };
    const enc = new TextEncoder();

    const invokeCommand = new InvokeCommand({
      FunctionName: process.env.getModelDetailsFunctionArn,
      Payload: enc.encode(JSON.stringify(getModelEvent)),
    });

    const InvokeCommandOutput: InvokeCommandOutput = await lambdaClient.send(
      invokeCommand
    );

    const decoder = new TextDecoder("utf-8");
    const r = JSON.parse(decoder.decode(InvokeCommandOutput.Payload));
    console.log(r);
    projectVersionArn = r.ProjectVersionArns[0];
    localCache.set(key, projectVersionArn);
  } else {
    projectVersionArn = localCache.get(key)!;
  }

  const detectCustomLabelsCommand: DetectCustomLabelsCommand = new DetectCustomLabelsCommand(
    {
      ProjectVersionArn: projectVersionArn,
      Image: { Bytes: Uint8Array.from(result.files[0].content) },
    }
  );

  const deleteProjectCommandOutput: DetectCustomLabelsCommandOutput = await rekognitionClient.send(
    detectCustomLabelsCommand
  );
  return {
    statusCode: 200,
    body: JSON.stringify({
      Region: process.env.AWS_REGION,
      CustomLabels: deleteProjectCommandOutput.CustomLabels,
    }),
  };
};
