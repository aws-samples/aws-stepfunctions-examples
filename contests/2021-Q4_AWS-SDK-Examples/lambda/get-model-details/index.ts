import {
  RekognitionClient,
  DescribeProjectsCommand,
  ProjectDescription,
  DescribeProjectsCommandInput,
  DescribeProjectVersionsCommandInput,
  DescribeProjectVersionsCommand,
  ProjectVersionDescription,
} from "@aws-sdk/client-rekognition";

interface GetModelEvent {
  ProjectName: string;
  VersionNames?: string[];
  Region: string;
}

interface GetModelResult extends GetModelEvent {
  ProjectArn: string;
  ProjectVersionArns: string[];
  Status: string;
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
async function getProjectVersion(
  rekognitionClient: RekognitionClient,
  projectArn: string,
  versionNames?: string[]
): Promise<ProjectVersionDescription[]> {
  let versions: ProjectVersionDescription[] = Array<ProjectVersionDescription>();
  let params: DescribeProjectVersionsCommandInput = {
    ProjectArn: projectArn,
    MaxResults: 50,
  };
  if (versionNames && versionNames.length > 0) {
    params.VersionNames = versionNames;
  }
  let describeProjectVersionsCommand = new DescribeProjectVersionsCommand(
    params
  );

  let response = await rekognitionClient.send(describeProjectVersionsCommand);
  versions = [...versions, ...response.ProjectVersionDescriptions!];

  while (response.NextToken) {
    params.NextToken = response.NextToken;
    describeProjectVersionsCommand = new DescribeProjectVersionsCommand(params);
    response = await rekognitionClient.send(describeProjectVersionsCommand);
    versions = [...versions, ...response.ProjectVersionDescriptions!];
  }

  return versions;
}

export const lambdaHandler = async (
  event: GetModelEvent
): Promise<GetModelResult> => {
  // async/await.
  console.log(event);
  const projectName = event.ProjectName;
  const getModelResult: GetModelResult = event as GetModelResult;
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

    if (!existingProject) {
      getModelResult.Status = "Project Not Exist";
      return getModelResult;
    }

    getModelResult.ProjectArn = existingProject.ProjectArn!;

    getModelResult.ProjectVersionArns = (
      await getProjectVersion(
        rekognitionClient,
        existingProject.ProjectArn!,
        event.VersionNames
      )
    ).map((c) => c.ProjectVersionArn!);
    if (!event.VersionNames || event.VersionNames.length == 0) {
      const getProjectVersion = (arn: string) => {
        let matches = arn.match(/version\/[\s\S]*?\//);
        const m = matches![0];
        return m.substring("version/".length, m.length - 1);
      };
      getModelResult.VersionNames = getModelResult.ProjectVersionArns.map(
        getProjectVersion
      );
    }
    return getModelResult;

    // process data.
  } catch (error) {
    console.error(error);
    getModelResult.Status = "FAILED";
    return getModelResult;
  }
};
