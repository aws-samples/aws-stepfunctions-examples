# demo-forecast-service-integration

This project contains source code and supporting files for a serverless application that you can deploy with the SAM CLI. It includes the following files and folders:

```
demo-forecast-service-integration
└── bootstrap_deployment_script.sh # Script the deploy the application
    item-demand-time.csv  # Initial training dataset
    template
    └── template.yaml  #A template that defines the application's AWS resources.
```
This application creates Step Functions workflow for Amazon Forecast Service using the recently announced AWS SDK Service integration with Step Functions (https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html)



## Deploy the sample application

The Serverless Application Model Command Line Interface (SAM CLI) is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda.

To use the SAM CLI, you need the following tools:

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)


To build and deploy your application, run the following in your shell:
1) Git clone the repo from (https://github.com/aws-samples/aws-stepfunctions-examples/tree/main/sam/demo-forecast-service-integration).
2) Change directory to cloned repo.
```bash
$ cd demo-forecast-service-integration
```
3) Enable execute permissions for the deployment script
```bash
$ chmod 700 ./bootstrap_deployment_script.sh
```
4) Execute the script with a stack name of your choosing as parameter.
```bash
$ ./bootstrap_deployment_script.sh <Here goes your stack name>
```
This script builds the SAM template and deploys the stack under the given name.
The SAM template creates the underlying resources like S3 bucket, IAM policies,
and Step Functions workflow. The script also copies the data file used for
training to the newly created S3 bucket.

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
$ sam delete --stack-name <Here goes your stack name>
```
Note: To delete the S3 bucket, Fist empty the contents of the S3 bucket.
