# Sample stock trading application to showcase customer-managed AWS KMS Key usage in Step Functions

This is a sample application which highlights the usage of customer-managed AWS KMS key in AWS Step Functions.

## Deploy the sample application

To use the SAM CLI, you need the following tools:

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 20](https://nodejs.org/en/), including the NPM package management tool.

To build and deploy your application for the first time, run the following in your shell:

```bash
sam build && sam deploy --guided
```

You can find your State Machine ARN in the output values displayed after deployment.

## Testing Step Functions locally
You can test the application by just starting the execution of the Step Functions workflow, either through AWS CLI or AWS Console.

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
sam delete --stack-name app-sfn-kms-integration
```
