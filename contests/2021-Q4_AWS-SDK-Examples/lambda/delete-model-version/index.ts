import {
  RekognitionClient,
  DeleteProjectVersionCommand,
  DeleteProjectVersionCommandOutput,
} from "@aws-sdk/client-rekognition";

interface DeleteModelEvent {
  ProjectName: string;
  ProjectArn: string;
  ProjectVersionArn: string;
  Region: string;
}

interface DeleteModelResult extends DeleteModelEvent {
  Status: string;
}

export const lambdaHandler = async (
  event: DeleteModelEvent
): Promise<DeleteModelResult> => {
  // async/await.
  console.log(event);
  const resultEvent: DeleteModelResult = event as DeleteModelResult;
  try {
    const rekognitionClient = new RekognitionClient({
      region: event.Region,
    });

    const deleteProjectCommand = new DeleteProjectVersionCommand({
      ProjectVersionArn: event.ProjectVersionArn,
    });

    const deleteProjectVersionCommandOutput: DeleteProjectVersionCommandOutput = await rekognitionClient.send(
      deleteProjectCommand
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
