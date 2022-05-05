import {
  RekognitionClient,
  DescribeProjectsCommand,
  CreateProjectCommand,
  CreateProjectCommandOutput,
  CreateProjectVersionCommand,
  CreateProjectVersionCommandOutput,
  ProjectDescription,
  DescribeProjectsCommandInput,
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
  Status: string;
}

async function getAllProjects(rekognitionClient:RekognitionClient):Promise<ProjectDescription[]> {
    let projects:ProjectDescription[] = Array<ProjectDescription>();
    let params:DescribeProjectsCommandInput= {MaxResults:50}
    let describeProjectsCommand = new DescribeProjectsCommand(params);
    
    let response = await rekognitionClient.send(describeProjectsCommand);
    projects = [...projects, ...response.ProjectDescriptions!];

    while(response.NextToken) {
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

    const getProjectName = (arn:string)=>{
          let matches = arn.match(/:project\/[\s\S]*?\//);
          return matches![0];
    }
    
    const existingProject = (await getAllProjects(rekognitionClient)).find(c=>getProjectName(c.ProjectArn!) === projectName);
    let projectArn:string|undefined;
    if(!existingProject){
    
        const createProjectCommand = new CreateProjectCommand({
          ProjectName: projectName,
        });
        const createProjectCommandOutput: CreateProjectCommandOutput = await rekognitionClient.send(
          createProjectCommand
        );
    
        console.log(createProjectCommandOutput);
    }else{
      projectArn = existingProject.ProjectArn;
    }
    const createProjectVersionCommand = new CreateProjectVersionCommand({
      ProjectArn: projectArn,
      VersionName: event.VersionName,
      OutputConfig: {
        S3Bucket: event.OutputBucket,
        S3KeyPrefix: "output/",
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

    // process data.
  } catch (error) {
    console.error(error);
    resultEvent.Status = "error";
    return resultEvent;
  } finally {
    // finally.
    resultEvent.Status = "ok";
    return resultEvent;
  }
};
