## aws-stepfunctions-examples

AWS Step Functions is a low-code visual workflow service. This repository includes detailed examples that will help you unlock the power of serverless workflow.

## Examples and Supporting Blog Posts

### Accelerating workloads using parallelism in AWS Step Functions

In this example, you use [AWS Step Functions](https://aws.amazon.com/step-functions/) to build an application that uses parallel processing to complete four hours of work in around 60 seconds.

Blog Post: [Accelerating workloads using parallelism in AWS Step Functions](https://aws.amazon.com/blogs/compute/accelerating-workloads-using-parallelism-in-aws-step-functions/)

### Controlling concurrency in distributed systems using AWS Step Functions

In this example, you use [AWS Step Functions](https://aws.amazon.com/step-functions/) to control concurrency in your distributed system. This helps you avoid overloading limited resources in your serverless data processing pipeline or reduce availability risk by controlling velocity in your IT automation workflows.

Blog Post: [Controlling concurrency in distributed systems using AWS Step Functions](https://aws.amazon.com/blogs/compute/controlling-concurrency-in-distributed-systems-using-aws-step-functions/)

### Mocking service integrations with Step Functions Local
In this example, you use AWS Step Functions' Local to test a state machine by mocking the service calls. You can find details in the example's [README](./sam/app-local-testing-mock-config/README.md) file.

Blog Post: [Mocking service integrations with AWS Step Functions Local](https://aws.amazon.com/blogs/compute/mocking-service-integrations-with-aws-step-functions-local/)

### Orchestrating S3 Glacier Deep Archive object retrieval using Step Functions
In this example, you use AWS Step Functions to orchestrate restoration of S3 objects from S3 Glacier Deep Archive. You can find details in the example's [README](./cdk/app-glacier-deep-archive-retrieval/README.md) file.

Blog Post: [Orchestrating S3 Glacier Deep Archive object retrieval using Step Functions](Blog Link Here)

### Video Segment Detection and Edition with using AWS Step Functions
This workflow is meant to show you how to leverage AWS Step Functions for performing typical video edition tasks. Specifically, the example uses a video that has [SMPTE color bars](https://en.wikipedia.org/wiki/SMPTE_color_bars) of random duration at the beginning. The workflow will get a demo video from S3, put it through Amazon Rekognition for detecting segments, and then Amazon MediaConvert removes the initial video segment (SMPTE color bars). You can find details in the example's [README](./sam/app-video-segment-detection-and-edition/README.md) file.

Blog Post: [Low code workflows with AWS Elemental MediaConvert](https://aws.amazon.com/blogs/media/low-code-workflows-with-aws-elemental-mediaconvert/)

## Demos of Step Functions capabilities

### Demo Step Functions Local testing with Mock service integrations using Java testing frameworks (JUnit and Spock)
In this demo, you can learn how to use JUnit or Spock to run Step Functions Local tests. This is helpful if your current serverless applications are built around Java. With this approach you can leverage the existing Java testing tools.

[Demo App](./sam/demo-local-testing-using-java/README.md)

### ASL Demo

This demo illustrates capabilities of ASL and [AWS Step Functions](https://aws.amazon.com/step-functions/) including Intrinsic Functions and JSON Path Processing.

You can deploy this using SAM or independently as a CloudFormation template in AWS Console

### Video Transcription with AWS SDK Service Integrations ###

In this demo, you learn how to use AWS SDK Service Integrations to build a video transcription workflow.

Blog Post: [Now — AWS Step Functions Supports 200 AWS Services To Enable Easier Workflow Automation](https://github.com/aws-samples/aws-stepfunctions-examples/tree/main/sam/demo-video-transcription)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

