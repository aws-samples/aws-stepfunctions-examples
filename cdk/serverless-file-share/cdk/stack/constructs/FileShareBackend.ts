import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy, Stack, aws_lambda_nodejs } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

import { defaultBucketSettings } from '../helpers/S3Settings';
import StepFunctionApiIntegration from '../helpers/StepFunctionApiIntegration';
import { StepFunctionInvokeLambda } from '../helpers/StepFunctionInvokeLambda';

interface FileShareBackendProps {
  stackName: string;
  region: string;
}

export class FileShareBackend extends Construct {
  public api: apigateway.RestApi;
  public userPool: cognito.UserPool;
  public userPoolClient: cognito.UserPoolClient;
  public loggingBucket: s3.Bucket;
  public analyticsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: FileShareBackendProps) {
    super(scope, id);

    /*-------------------------------
     * Set up S3 buckets
     -------------------------------*/

    // Create an S3 bucket to store S3 access logs
    this.loggingBucket = new s3.Bucket(this, 's3-logs', defaultBucketSettings);

    // Create S3 analytics bucket for running Athena queries
    this.analyticsBucket = new s3.Bucket(this, 's3-analytics', defaultBucketSettings);

    // Create an S3 bucket to store the files to share/download
    const bucket = new s3.Bucket(this, 's3-files', {
      ...defaultBucketSettings,
      serverAccessLogsBucket: this.loggingBucket,
      serverAccessLogsPrefix: 'file_access_logs/',
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedHeaders: ['*'],
        },
      ],
    });

    /*-------------------------------
     * Set up Dynamo DB tables
     -------------------------------*/

    // Create a DynamoDB table to store file meta data and permissions
    const fileTable = new dynamodb.Table(this, 'files', {
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recipientEmail', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create global secondary index to query files by owner
    fileTable.addGlobalSecondaryIndex({
      indexName: 'OwnerIndex',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
    });

    // Create global secondary index to query files by recipient
    fileTable.addGlobalSecondaryIndex({
      indexName: 'RecipientIndex',
      partitionKey: { name: 'recipientEmail', type: dynamodb.AttributeType.STRING },
    });

    // Create a DynamoDB table to track download requests
    const downloadTable = new dynamodb.Table(this, 'downloads', {
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'downloadId', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /*-------------------------------
     * Set up Cognito for authentication
     -------------------------------*/

    // Create a Cognito user pool
    this.userPool = new cognito.UserPool(this, 'user-pool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: { fullname: { required: true } },
      passwordPolicy: {
        minLength: 8,
        requireDigits: false,
        requireLowercase: false,
        requireSymbols: false,
        requireUppercase: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create a Cognito user pool client
    this.userPoolClient = new cognito.UserPoolClient(this, 'user-pool-client', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Cognito API Gateway authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'cognito-authorizer', {
      cognitoUserPools: [this.userPool],
    });

    // Authorizer settings for each API end point
    const authorizerSettings = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['aws.cognito.signin.user.admin'],
    };

    // IAM policy for Lambda functions to retrieve Cognito user info
    const cognitoIamPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:AdminGetUser'],
      resources: [
        cdk.Arn.format(
          {
            service: 'cognito-idp',
            resource: 'userpool',
            resourceName: this.userPool.userPoolId,
          },
          cdk.Stack.of(this),
        ),
      ],
    });

    /*-------------------------------
     * Set up Lambda function settings
     -------------------------------*/

    // Declare environment variables for Lambda functions
    const environment = {
      AWS_ACCOUNT_ID: Stack.of(this).account,
      POWERTOOLS_SERVICE_NAME: props.stackName,
      POWERTOOLS_METRICS_NAMESPACE: props.stackName,
      POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      BUCKET_NAME: bucket.bucketName,
      FILE_TABLE: fileTable.tableName,
      DOWNLOAD_TABLE: downloadTable.tableName,
      COGNITO_USER_POOL_ID: this.userPool.userPoolId,
      REGION: props.region,
    };

    // Global Lambda settings for each function
    const functionSettings = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      environment,
      logRetention: logs.RetentionDays.THREE_MONTHS,
      logRetentionRetryOptions: {
        base: cdk.Duration.millis(200),
        maxRetries: 10,
      },
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
      },
      awsSdkConnectionReuse: true,
      timeout: Duration.seconds(30),
    };

    // Helper function create a lambda function
    const createLambdaFn = (name: string, path: string) => {
      return new aws_lambda_nodejs.NodejsFunction(this, name, {
        entry: `./src/functions/${path}`,
        ...functionSettings,
      });
    };

    /*-------------------------------
     * Lambda functions
     -------------------------------*/

    // Create Lambda functions
    const getOwnedFilesFn = createLambdaFn('getOwnedFiles', 'getOwnedFiles.ts');
    const getSharedFilesFn = createLambdaFn('getSharedFiles', 'getSharedFiles.ts');
    const deleteRecipientsFn = createLambdaFn('deleteRecipients', 'deleteRecipients.ts');
    const deleteFileFn = createLambdaFn('deleteFile', 'deleteFile.ts');
    const uploadFileFn = createLambdaFn('uploadFile', 'uploadFile.ts');
    const getUserInfoFn = createLambdaFn('getUserInfo', 'getUserInfo.ts');
    const validateDownloadRequestFn = createLambdaFn('validateDownloadRequest', 'download/validateDownloadRequest.ts');
    const authorizeDownloadRequestFn = createLambdaFn('authorizeDownloadRequest', 'download/authorizeDownloadRequest.ts');
    const auditDownloadRequestFn = createLambdaFn('auditDownloadRequest', 'download/auditDownloadRequest.ts');
    const processDownloadRequestFn = createLambdaFn('processDownloadRequest', 'download/processDownloadRequest.ts');
    const validateShareRequestFn = createLambdaFn('validateShareRequest', 'share/validateShareRequest.ts');
    const authorizeShareRequestFn = createLambdaFn('authorizeShareRequest', 'share/authorizeShareRequest.ts');
    const auditShareRequestFn = createLambdaFn('auditShareRequest', 'share/auditShareRequest.ts');
    const processShareRequestFn = createLambdaFn('processShareRequest', 'share/processShareRequest.ts');
    const sendNotificationsFn = createLambdaFn('sendNotifications', 'share/sendNotifications.ts');

    // Add permissions to read data from database
    fileTable.grantReadData(getOwnedFilesFn);
    fileTable.grantReadData(getSharedFilesFn);
    fileTable.grantReadData(deleteRecipientsFn);
    fileTable.grantReadData(deleteFileFn);
    fileTable.grantReadData(authorizeDownloadRequestFn);
    fileTable.grantReadData(processShareRequestFn);
    downloadTable.grantReadData(authorizeDownloadRequestFn);

    // Add permissions to write data to database
    fileTable.grantWriteData(deleteRecipientsFn);
    fileTable.grantWriteData(deleteFileFn);
    fileTable.grantWriteData(processShareRequestFn);
    downloadTable.grantWriteData(auditDownloadRequestFn);

    // Add permissions fetch user info from cognito
    getSharedFilesFn.addToRolePolicy(cognitoIamPolicy);
    getUserInfoFn.addToRolePolicy(cognitoIamPolicy);

    // Add permissions to fetch meta data from S3 file bucket
    bucket.grantRead(processDownloadRequestFn);
    bucket.grantRead(authorizeShareRequestFn);

    // Add permissions to read/write from S3 file bucket
    bucket.grantReadWrite(uploadFileFn);
    bucket.grantReadWrite(deleteFileFn);

    /*-------------------------------
     * Set up API gateway
     -------------------------------*/

    // Create log group for API gateway
    const apiLogGroup = new logs.LogGroup(this, 'api-access-logs', {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create an API Gateway to expose the Lambda function
    this.api = new apigateway.RestApi(this, 'rest-api', {
      restApiName: props.stackName,
      description: 'API for downloading files from S3',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        tracingEnabled: true,
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    /*-------------------------------
     * Set up API Gateway routes
     -------------------------------*/

    // Declare API route: /owned-files
    const ownedFiles = this.api.root.addResource('owned-files');

    // Declare API route: /owned-files/{fileId}
    const ownedFilesFile = ownedFiles.addResource('{fileId}');

    // Declare API route: /owned-files/{fileId}/recipients
    const ownedFilesRecipients = ownedFilesFile.addResource('recipients');

    // GET /owned-files
    ownedFiles.addMethod('GET', new apigateway.LambdaIntegration(getOwnedFilesFn), authorizerSettings);

    // DELETE /owned-files/{fileId}
    ownedFilesFile.addMethod('DELETE', new apigateway.LambdaIntegration(deleteFileFn), authorizerSettings);

    // DELETE /owned-files/{fileId}/recipients
    ownedFilesRecipients.addMethod('DELETE', new apigateway.LambdaIntegration(deleteRecipientsFn), authorizerSettings);

    // GET /shared-files
    this.api.root.addResource('shared-files').addMethod('GET', new apigateway.LambdaIntegration(getSharedFilesFn), authorizerSettings);

    // GET /upload/{filepath+}
    this.api.root
      .addResource('upload')
      .addResource('{filepath+}')
      .addMethod('GET', new apigateway.LambdaIntegration(uploadFileFn), authorizerSettings);

    /*-------------------------------
     * Step functions
     -------------------------------*/

    // define fail states
    const downloadErrorStep = new sfn.Fail(this, 'Download Error', {
      error: 'Download step function failed',
    });

    const shareErrorStep = new sfn.Fail(this, 'Share Error', {
      error: 'Share step function failed',
    });

    // define 'Download' state machine
    const downloadStepFunction = new sfn.StateMachine(this, 'download-step-function', {
      stateMachineType: sfn.StateMachineType.EXPRESS,
      tracingEnabled: true,
      definitionBody: sfn.DefinitionBody.fromChainable(
        sfn.Chain.start(
          StepFunctionInvokeLambda(this, validateDownloadRequestFn, 'Validate download request', downloadErrorStep)
            .next(StepFunctionInvokeLambda(this, getUserInfoFn, 'Get user info for download request', downloadErrorStep))
            .next(StepFunctionInvokeLambda(this, authorizeDownloadRequestFn, 'Authorize download request', downloadErrorStep))
            .next(StepFunctionInvokeLambda(this, auditDownloadRequestFn, 'Audit download request', downloadErrorStep))
            .next(StepFunctionInvokeLambda(this, processDownloadRequestFn, 'Process download request', downloadErrorStep)),
        ),
      ),
    });

    // add 'Download' state machine to API
    this.api.root
      .addResource('download')
      .addResource('{fileId}')
      .addMethod('GET', StepFunctionApiIntegration(downloadStepFunction, [{ name: 'fileId', sourceType: 'params' }]), authorizerSettings);

    // define 'Share' state machine
    const shareStepFunction = new sfn.StateMachine(this, 'share-step-function', {
      stateMachineType: sfn.StateMachineType.EXPRESS,
      tracingEnabled: true,
      definitionBody: sfn.DefinitionBody.fromChainable(
        sfn.Chain.start(
          StepFunctionInvokeLambda(this, validateShareRequestFn, 'Validate share request', shareErrorStep)
            .next(StepFunctionInvokeLambda(this, getUserInfoFn, 'Get user info for share request', shareErrorStep))
            .next(StepFunctionInvokeLambda(this, authorizeShareRequestFn, 'Authorize share request', shareErrorStep))
            .next(StepFunctionInvokeLambda(this, auditShareRequestFn, 'Audit share request', shareErrorStep))
            .next(StepFunctionInvokeLambda(this, processShareRequestFn, 'Process share request', shareErrorStep))
            .next(StepFunctionInvokeLambda(this, sendNotificationsFn, 'Send notifications', shareErrorStep)),
        ),
      ),
    });

    // add 'Share' state machine to API
    this.api.root
      .addResource('share')
      .addResource('{fileId}')
      .addMethod(
        'POST',
        StepFunctionApiIntegration(shareStepFunction, [
          { name: 'fileId', sourceType: 'params' },
          { name: 'recipients', sourceType: 'body' },
          { name: 'expiryDate', sourceType: 'body' },
          { name: 'downloadLimit', sourceType: 'body' },
        ]),
        authorizerSettings,
      );
  }
}
