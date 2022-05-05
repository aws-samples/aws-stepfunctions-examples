import {
  RekognitionClient,
  DescribeProjectVersionsCommandInput,
  DescribeProjectVersionsCommand,
} from "@aws-sdk/client-rekognition";

interface DescribeModelVersionEvent {
  ProjectName: string;
  ProjectArn: string;
  ManifestKey: string;
  VersionName: string;
  VersionNames: string[];
  Region: string;
  TrainingDataBucket: string;
  OutputBucket: string;
  ProjectVersionArn: string;
  Status: String;
  Counter: Number;
}

export const lambdaHandler = async (
  event: DescribeModelVersionEvent
): Promise<DescribeModelVersionEvent> => {
  // async/await.
  console.log(event);
  try {
    const rekognitionClient = new RekognitionClient({
      region: event.Region,
    });
    let resultEvent: DescribeModelVersionEvent = { ...event };
    let params: DescribeProjectVersionsCommandInput = {
      ProjectArn: event.ProjectArn,
      VersionNames: event.VersionNames ?? [event.VersionName],
    };
    let describeProjectVersionsCommand = new DescribeProjectVersionsCommand(
      params
    );
    let response = await rekognitionClient.send(describeProjectVersionsCommand);

    if (response.ProjectVersionDescriptions!.length == 0) {
      resultEvent.Status = "DELETED";
      return resultEvent;
    }

    resultEvent.Status = response.ProjectVersionDescriptions![0].Status!;
    resultEvent.Counter = +resultEvent.Counter + 1;
    return resultEvent;

    // process data.
  } catch (error) {
    console.error(error);
    let resultEvent: DescribeModelVersionEvent = { ...event };
    resultEvent.Status = "FAILED";
    return resultEvent;
  }
};
