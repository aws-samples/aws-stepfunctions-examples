import { S3CreateEvent } from "aws-lambda";
import {
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

async function streamToString(stream: Readable): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}
export const lambdaHandler = async (event: S3CreateEvent): Promise<String> => {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectkey = event.Records[0].s3.object.key;
  console.log(bucketName, objectkey);

  // async/await.
  try {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectkey,
    });
    const data: GetObjectCommandOutput = await s3Client.send(getObjectCommand);

    let bodyContents = await streamToString(data.Body as Readable);
    let matches = bodyContents.match(/s3:\/\/[\s\S]*?\//);
    let previousBucket = matches![0];

    if (previousBucket.includes(bucketName)) return "Repeated!";
    bodyContents = bodyContents
      .split(previousBucket)
      .join("s3://" + bucketName + "/");
    console.log(bodyContents);

    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectkey,
      Body: bodyContents,
    });
    const putObjectCommandOutput: PutObjectCommandOutput = await s3Client.send(
      putObjectCommand
    );
    console.log(putObjectCommandOutput);

    // process data.
  } catch (error) {
    console.error(error);
    return error;
    // error handling.
  } finally {
    // finally.
    return "OK";
  }
};
