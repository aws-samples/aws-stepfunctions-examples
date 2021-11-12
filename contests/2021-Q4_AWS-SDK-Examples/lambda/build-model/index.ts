import {
  RekognitionClient,
  DescribeProjectsCommand,
  CreateProjectCommand,
  CreateProjectCommandOutput,
  CreateProjectVersionCommand,
  CreateProjectVersionCommandOutput,
  ProjectDescription,
  DescribeProjectsCommandInput,
  DescribeProjectVersionsCommandInput,
  DescribeProjectVersionsCommand,
} from "@aws-sdk/client-rekognition";

interface BuildModelEvent {
  ProjectName: string;
  ManifestKey: string;
  VersionName: string;
  Region: string;
  TrainingDataBucket: string;
  OutputBucket: string;
}

interface BuildModelResult extends BuildModelEvent {
  ProjectArn: string;
  ProjectVersionArn: string;
  Status: string;
  Counter: Number;
}

async function getAllProjects(
  rekognitionClient: RekognitionClient
): Promise<ProjectDescription[]> {
  let projects: ProjectDescription[] = Array<ProjectDescription>();
  let params: DescribeProjectsCommandInput = { MaxResults: 50 };
  let describeProjectsCommand = new DescribeProjectsCommand(params);

  let response = await rekognitionClient.send(describeProjectsCommand);
  projects = [...projects, ...response.ProjectDescriptions!];

  while (response.NextToken) {
    params.NextToken = response.NextToken;
    describeProjectsCommand = new DescribeProjectsCommand(params);
    response = await rekognitionClient.send(describeProjectsCommand);
    projects = [...projects, ...response.ProjectDescriptions!];
  }

  return projects;
}

export const lambdaHandler = async (
  event: BuildModelEvent
): Promise<BuildModelResult> => {
  // async/await.
  console.log(event);
  const projectName = event.ProjectName;
  const manifestKey = event.ManifestKey;
  const resultEvent = event as BuildModelResult;
  try {
    const rekognitionClient = new RekognitionClient({
      region: event.Region,
    });

    const getProjectName = (arn: string) => {
      let matches = arn.match(/:project\/[\s\S]*?\//);
      return matches![0];
    };

    const existingProject = (await getAllProjects(rekognitionClient)).find(
      (c) => getProjectName(c.ProjectArn!) === ":project/" + projectName + "/"
    );
    let projectArn: string | undefined;

    if (!existingProject) {
      const createProjectCommand = new CreateProjectCommand({
        ProjectName: projectName,
      });
      const createProjectCommandOutput: CreateProjectCommandOutput = await rekognitionClient.send(
        createProjectCommand
      );
      console.log(createProjectCommandOutput);
      projectArn = createProjectCommandOutput.ProjectArn;
    } else {
      projectArn = existingProject.ProjectArn;

      let params: DescribeProjectVersionsCommandInput = {
        ProjectArn: projectArn,
        VersionNames: [event.VersionName],
      };
      let describeProjectVersionsCommand = new DescribeProjectVersionsCommand(
        params
      );
      let response = await rekognitionClient.send(
        describeProjectVersionsCommand
      );

      const projectVerion = response.ProjectVersionDescriptions![0];
      if (projectVerion != null) {
        resultEvent.Status = projectVerion.Status!;
        resultEvent.ProjectArn = projectArn!;
        resultEvent.ProjectVersionArn = projectVerion.ProjectVersionArn!;
        resultEvent.Counter = 0;
        return resultEvent;
      }
    }

    const createProjectVersionCommand = new CreateProjectVersionCommand({
      ProjectArn: projectArn,
      VersionName: event.VersionName,
      OutputConfig: {
        S3Bucket: event.OutputBucket,
        S3KeyPrefix: "output",
      },
      TestingData: {
        AutoCreate: true,
      },
      TrainingData: {
        Assets: [
          {
            GroundTruthManifest: {
              S3Object: {
                Bucket: event.TrainingDataBucket,
                Name: manifestKey,
              },
            },
          },
        ],
      },
    });

    const createProjectVersionCommandOutput: CreateProjectVersionCommandOutput = await rekognitionClient.send(
      createProjectVersionCommand
    );
    console.log(createProjectVersionCommandOutput);

    resultEvent.Status = "STARTING";
    resultEvent.ProjectArn = projectArn!;
    resultEvent.ProjectVersionArn = createProjectVersionCommandOutput.ProjectVersionArn!;
    resultEvent.Counter = 0;
    return resultEvent;

    // process data.
  } catch (error) {
    console.error(error);
    resultEvent.Status = "FAILED";
    return resultEvent;
  }
};
