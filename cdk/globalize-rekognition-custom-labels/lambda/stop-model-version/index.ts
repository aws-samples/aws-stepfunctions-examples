import {
  RekognitionClient,
  StopProjectVersionCommand,
  StopProjectVersionCommandOutput,
} from "@aws-sdk/client-rekognition";

interface StopModelEvent {
  ProjectName: string;
  ProjectArn: string;
  ProjectVersionArn: string;
  Region: string;
}

interface StopModelResult extends StopModelEvent {
  Status: string;
}

export const lambdaHandler = async (
  event: StopModelEvent
): Promise<StopModelResult> => {
  // async/await.
  console.log(event);
  const resultEvent: StopModelResult = event as StopModelResult;
  try {
    const rekognitionClient = new RekognitionClient({
      region: event.Region,
    });

    const stopProjectCommand = new StopProjectVersionCommand({
      ProjectVersionArn: event.ProjectVersionArn,
    });

    const deleteProjectVersionCommandOutput: StopProjectVersionCommandOutput = await rekognitionClient.send(
      stopProjectCommand
    );

    resultEvent.Status = deleteProjectVersionCommandOutput.Status!;
    return resultEvent;

    // process data.
  } catch (error) {
    console.error(error);
    resultEvent.Status = "FAILED";
    return resultEvent;
  }
};
