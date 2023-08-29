## AWS Serverless File Share - CDK Project

This CDK project deploys the infrastructure required to support the serverless file share solution described in the AWS blog post: [Enhancing file sharing using Amazon S3 and AWS Step Functions](https://aws.amazon.com/blogs/compute/enhancing-file-sharing-using-amazon-s3-and-aws-step-functions)

---

### Architecture

<img src="../docs/img/architecture_diagram.png" />

---

### Before you get started

From the ```/cdk``` project directory:

**Step 1: Install dependencies**
```
npm install
```

**Step 2: Build UI project**

Build the React UI project so that it is ready to deploy.
```
npm run build:ui
```  

**Step 3: Setup AWS profile (optional)** 

If you don't want to use the default AWS profile and use a specific profile, set an environment variable:

```
AWS_PROFILE=myProfile
```

In the project root folder create a file called ``.env`` and include the above.

---

### Building & Deploying

#### Build CDK package

Will generate CloudFormation template and package Lambda code ready for deployment.

```
npm run build
```

#### Deploy to AWS

Will build and deploy to AWS.

```
npm run deploy
```

#### For prod build/deployment

Will use environment variables in ```.env.prod``` instead of ```.env```

```
yarn build:prod
yarn deploy:prod
```

---

### API Endpoints

The API in this solution exposes the following end points. (Note: each endpoint is protected using a Cognito Authorizer and requires the user to first login through the UI)

End point|Method|Invokes|Description|Input|Response
---------|------|-------|-----------|-----|--------
`/owned-files`|GET|Lambda|Retrieve a list of files owned by the currently logged in user|None|Array of file objects. Each file object has file metadata (e.g. filename, size) + an array of recipients.
`/shared-files`|GET|Lambda|Retrieve a list of files that have been shared by other users with the currently logged in user.|None|Array of file objects.
`/owned-files/{fileId}`|DELETE|Lambda|Delete a file|File ID (passed through URL)|None
`/owned-files/{fileId}/recipients`|DELETE|Lambda|Remove recipients from being able to access a file|File ID (passed through URL) + Array of recipients (passed through request body)|None
`/upload/{filename}`|GET|Lambda|Generates a presigned URL that can be used to upload a file.|Filename (passed through URL)|Presigned upload URL + generated File ID
`/share/{fileId}`|POST|Step Function|Initiates the "share"  workflow. Stores share request in database and sends notifications to recipients.|File ID (passed through URL) + Array of recipients (passed through request body)|None
`/download/{fileId}`|GET|Step Function|Initiates the "download" workflow. Authorises the download request and returns a link for the client to download the file.|File ID (passed through URL)|Presigned Download URL

## Analytics

To setup the QuickSight dashboard, please [click here](../docs/Analytics.md).
