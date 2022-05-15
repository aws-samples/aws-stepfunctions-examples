import {
  RekognitionClient,
  StartProjectVersionCommand,
  StartProjectVersionCommandOutput,
} from "@aws-sdk/client-rekognition";

interface StartModelEvent {
  ProjectName: string;
  ProjectArn: string;
  MinInferenceUnits: Number;
  ProjectVersionArn: string;
  Region: string;
}

interface StartModelResult extends StartModelEvent {
  Status: string;
}

export const lambdaHandler = async (
  event: StartModelEvent
): Promise<StartModelResult> => {
  // async/await.
  console.log(event);
  const resultEvent: StartModelResult = event as StartModelResult;
  try {
    const rekognitionClient = new RekognitionClient({
      region: event.Region,
    });

    const startProjectCommand = new StartProjectVersionCommand({
      ProjectVersionArn: event.ProjectVersionArn,
      MinInferenceUnits: +event.MinInferenceUnits,
    });

    const deleteProjectVersionCommandOutput: StartProjectVersionCommandOutput = await rekognitionClient.send(
      startProjectCommand
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
