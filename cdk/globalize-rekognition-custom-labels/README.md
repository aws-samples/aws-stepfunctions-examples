# Globalize Your Amazon Rekognition Custom Labels vice AWS StepFunction and CDK

## Introduction

At this moment, [Amazon Rekognition Custom
Labels](https://aws.amazon.com/rekognition/custom-labels-features/) is a
regional service. We are building real-time AWS DeepRacer analytics with Amazon
Rekognition Custom Labels and Amazon Kinesis Video. We hope the solution can be
used around the world. To reduce the network latency and make it high
availability, we want to deploy the model to all regions with Amazon Rekognition
Custom Labels support. At this moment, you cannot copy model to another region
directly and you need to rebuild the model in each region. It is time-consuming
and error-prone if you do it manually. On the other hand, for the place like
Hong Kong, our application needs to call the model in another region, and we
don’t know which region is the best.

Therefore, our team develops “Global Amazon Rekognition Custom Labels” - a [AWS
Cloud Development Kit](https://aws.amazon.com/cdk/) project to resolve those
problems and automate the common tasks for both single regional and Global
Amazon Rekognition Custom Labels.

## How it works?

### Dataset Synchronization

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image001.png)

To rebuild model in each region, the dataset needs to
[replicate](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)
to the Amazon S3 bucket in the same region of Amazon Rekognition Custom Labels.
All regional training buckets are configured as the destination bucket. Process
manifest lambda function replaces the source bucket name to the destination
bucket name.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image003.png)

Example command to copy dataset into the management training data bucket.

| aws s3 sync s3://hongkong-datasets s3://custom-labels-global-XXX-us-east-1 --source-region ap-east-1 |
|------------------------------------------------------------------------------------------------------|

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image005.png)  
It will replicate the data to all regional training data bucket. Please wait
until all object’s [replication
status](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-status.html)
become COMPLETED for all regions before starting the model training job.

### Global Accelerator Amazon Rekognition Custom Labels Model Endpoint

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image007.png)

To minimize the network latency plus global resilience, we use [AWS Global
Accelerator](https://aws.amazon.com/global-accelerator/) to improve global
application availability and performance by using the AWS global network.

With [global performance-based
routing](https://aws.amazon.com/global-accelerator/features/#Global_performance-based_routing),
we don’t need to pick the regional endpoint ourselves.

Post Image to global accelerator endpoint, and this call is processed at
us-east-1.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image009.png)

postImage.sh

| baseUrl=xxxxxxxx.awsglobalaccelerator.com curl -i -X POST -H "Content-Type: multipart/form-data" -F "image=@DeepRacer.jpg" "http://\$baseUrl?ProjectName=AWSDeepRacer&VersionName=first" |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

When we call the endpoint from us-east-1b.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image011.jpg)

When we call the endpoint from us-west-1c.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image013.jpg)

When we call the endpoint from Hong Kong.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image015.jpg)

### Workflow Automation

We develop 4 [AWS Step
Functions](https://aws.amazon.com/step-functions/?step-functions.sort-by=item.additionalFields.postDateTime&step-functions.sort-order=desc)
to automate task globally.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image017.jpg)

#### Create and Build Model Stepfunction

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image019.png)

Create project and project version in all regions with below input json.

| { "ProjectName": "AWSDeepRacer",  "ManifestKey":"assets/deepracerv1r/output.manifest",  "VersionName": "first" } |
|------------------------------------------------------------------------------------------------------------------|

1.  Set Regional Data – provides the regional information such as region code,
    training dataset bucket name and output bucket name.

2.  Map Task – parallel run the sub-workflow for each region.

3.  Build Model Lambda Task – create project if it does not exist and create
    project version.

4.  “Wait 5 minutes”, “Get Job Status” and “Training Complete?” - polling for
    the model training status.

    1.  Build Model Failed – if model version status is “FAILED” or the training
        time exceeds the maximum time.

    2.  Final - if model version status is “TRAINING_COMPLETED”.

5.  Notify Global Custom Labels Model Task – publish to [Amazon Simple
    Notification Service](Amazon%20Simple%20Notification%20Service) (SNS) topic
    to notify user or other system.

Parallel model training in 11 regions.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image021.png)

#### Start Model Version Stepfunction

![](media/d9e5702e0cf75380fde41012fedaa408.png)

[Start model
version](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/rm-start-model-console.html)
in all regions with below input json.

| { "ProjectName": "AWSDeepRacer",  "VersionNames": ["first","second"],  "MinInferenceUnits": 1 } |
|-------------------------------------------------------------------------------------------------|

1.  Set Regional Data – provides the regional information such as region code,
    training dataset bucket name and output bucket name.

2.  Map Task – parallel run the sub-workflow for each region.

3.  Get Model Details – query the project arn based on Project Name and project
    version arn(s) based on VersionNames array such as “first” and “second” in
    this case.

4.  Map Task – parallel run the sub-workflow for each model version.

5.  Pass – uses to keep in original input.

6.  Start Model Version– start one project version such as “first”.

7.  “Wait 5 minutes”, “Get Job Status” and “Start Version Complete?” - polling
    for the model training status.

    1.  Start Model Version Failed – if model version status is “FAILED” or the
        training time exceeds the maximum time.

    2.  Version Started - if model version status is “RUNNING”.

8.  Complete Parallel Start Version – synchronize point.

9.  Notify Global Custom Labels Model Task – publish to [Amazon Simple
    Notification Service](Amazon%20Simple%20Notification%20Service) (SNS) topic
    to notify user or other system.

Parallel Start Project Version in 11 regions

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image023.png)

#### Stop Model Version Stepfunction

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image025.png)

[Stop
model](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/rm-stop-model-sdk.html)
version in all regions with below input json.

| { "ProjectName": "AWSDeepRacer", "VersionNames": ["first","second"] } |
|-----------------------------------------------------------------------|

1.  Set Regional Data – provides the regional information such as region code,
    training dataset bucket name and output bucket name.

2.  Map Task – parallel run the sub-workflow for each region.

3.  Get Model Details – query the project arn based on Project Name and project
    version arn(s) based on VersionNames array such as “first” and “second” in
    this case.

4.  Map Task – parallel run the sub-workflow for each model version.

5.  Pass – uses to keep in original input.

6.  Stop Model Version– stop one project version such as “first”.

7.  “Wait 5 minutes”, “Get Job Status” and “Stop Version Complete?” - polling
    for the model training status.

    1.  Stop Model Version Failed – if model version status is “FAILED” or the
        training time exceeds the maximum time.

    2.  Version Stopped - if model version status is “STOPPED”.

8.  Complete Parallel Stop Version – synchronize point.

9.  Notify Global Custom Labels Model Task – publish to [Amazon Simple
    Notification Service](Amazon%20Simple%20Notification%20Service) (SNS) topic
    to notify user or other system.

Parallel stop project version in 11 regions.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image027.png)

#### Delete Model Stepfunction

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image029.png)

Delete project version(s) in all regions with below input json.

| { "ProjectName": "AWSDeepRacer", "VersionNames": ["first","second"]} |
|----------------------------------------------------------------------|

# hierarchical deletion

Delete project and project version(s) in all regions with below input json.

| { "ProjectName": "DeepRacer", "VersionNames": [] } |
|----------------------------------------------------|

1.  Set Regional Data – provides the regional information such as region code,
    training dataset bucket name and output bucket name.

2.  Map Task – parallel run the sub-workflow for each region.

3.  Get Version Details – query the project arn based on Project Name and
    project version arn(s) based on VersionNames array such as “first” and
    “second” in this case.

4.  Map Task – parallel run the sub-workflow for each model version.

5.  Pass – uses to keep in original input.

6.  Delete Version– delete one project version such as “first”.

7.  “Wait 5 minutes”, “Get Job Status” and “Delete Version Complete?” - polling
    for the model training status.

    1.  Delete Version Failed – if model version status is “FAILED” or the
        training time exceeds the maximum time.

    2.  Version Deleted - if model version status is “DELETED” which is
        generated from Lambda when the “Describe Project Versions” cannot get
        the version based on the version name.

8.  Complete Parallel Delete Version – synchronize point.

9.  "Delete Project?” – if the length of VersionNames array is 0, then go “Get
    Project Details”.

    1.  Get Project Details – get project arn.

    2.  Delete Project – delete the project.

    3.  Keep Project – do nothing.

10. Notify Global Custom Labels Model Task – publish to [Amazon Simple
    Notification Service](Amazon%20Simple%20Notification%20Service) (SNS) topic
    to notify user or other system.

Parallel Delete Project version in 11 regions.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image031.png)

Parallel Delete project in 11 regions.

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image033.png)

## Remark

For cost saving,

1.  You can delete dataset in the manage region bucket and it will send delete
    maker to all regions. Lifecycle policy will remove the object after one day.

2.  You can delete the project and deploy again anytime. It will not affect the
    existing Amazon Rekognition Custom Labels Model.

To delete project, you have first stopped all running project versions.

## How to deploy?

Create a [AWS Cloud9](https://aws.amazon.com/cloud9/) IDE with Amazon Linux 2
and clone the project.

| git clone <https://github.com/wongcyrus/global-amazon-rekognition-custom-labels> |
|----------------------------------------------------------------------------------|

To customize the deployment, you can modify
/global-amazon-rekognition-custom-labels/bin/global-rekognition-custom-labels.ts

![](https://github.com/wongcyrus/aws-stepfunctions-examples/raw/main/contests/2021-Q4_AWS-SDK-Examples/images/image035.png)

run the following 3 commands.

| cd global-amazon-rekognition-custom-labels ./install_all_packages.sh ./deploy.sh |
|----------------------------------------------------------------------------------|

Unemployment

| cd global-amazon-rekognition-custom-labels cdk destroy --all |
|--------------------------------------------------------------|

Answer “y” to confirm the deletion.

## Conclusion

We are the big fan of Amazon Rekognition Custom Labels and my students are not
really good at machine learning, but we can still create a high-quality computer
version application within a short period of time. We hope to create a global
platform for AWS DeepRacer real world competition Global Amazon Rekognition
Custom Labels is not only optimize the network performance but also simplify the
model management.

## Project with Global Amazon Rekognition Custom Labels
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/JE0b36_3l9w/0.jpg)](https://www.youtube.com/watch?v=JE0b36_3l9w)

Project collaborators include [Cyrus Wong](https://www.linkedin.com/in/cyruswong/), [Or Man Yi](https://www.linkedin.com/in/man-yi-or-03699821b/), [Cheung Nga Yin](https://www.linkedin.com/in/nga-yin-cheung-64699721b/), [LUM Shing Fung](https://www.linkedin.com/in/shing-fung-lum-73162321b/), [Hui Man Chun](https://www.linkedin.com/in/man-chun-hui-79462021b/) and [Pearly Law](https://www.linkedin.com/in/mei-ching-pearly-jean-law-172707171/) from the [IT114115 Higher Diploma in Cloud and Data Centre
Administration](http://www.vtc.edu.hk/admission/en/programme/it114115-higher-diploma-in-cloud-and-data-centre-administration/).
