# Document Text Analyzer

## Purpose
The objective of this state machine is to take an object from s3 and process it for PII (**P**ersonally **I**dentifiable **I**nformation) and sentiment. The state machine will break the S3 object down to < 5kb parts, run analysis, then publish an SNS topic so subscribers can get information on the object.

## AWS Services Used

The following services have been used as part of this state machine
* Lambda
* S3
* Comprehend

## Project Justification aka "Why Is This Needed?"

When detecting sentiment and pii entities on files, AWS Comprehend has a limit of 5KB for text size. In order to process the entirety of a file, it must be divided into chunks of less than 5KB each. Depending on the size of the file, this could cause an issue if the operation was run in a Lambda. So we use Step Functions to handle the processing where timing is not a problem.

### What Is This Data Used For?

Detecting PII entities is useful for redaction. Not everyone is allowed to see things that could identify another person. This is especially useful in medical or government industries. 

Sentiment is used to determine the overall tone of a file. If you need to know if a document has a positive, negative, mixed, or neutral tone - sentiment is going to give you that. Sentiment has value in identifying things like bias over time. Having sentiment as a data point over time will help isolate individuals who give unfair behavior toward one thing or another (be it good or bad).

### Don't Textract and Comprehend Do Redaction Already?

Yes. However, machines aren't always right. One thing humans have that machines don't is the power to understand *context*. So we provide the PII entity offsets to users so show recommendations for redaction. It should always be up to a human to decide what should and shouldn't be redacted from a document. 

This state machine provides consumers with the ability to pick and choose which data to redact by giving them the offsets and not performing redactions automatically.

## Example Input State

To start execution of the state machine, you only need to provide the object key as input

```json
{
  "objectKey": "myobject/withprefix"
}
```

*Note - Only objects with plain/text content types are accepted!*

## State Machine Flow

The state machine performs the following functions

1. Load metadata about the object from S3
2. Load 5KB parts of the object and save them off individually (loop until entire file is processed)
3. For each part
  1. Load the text from S3
  2. In parallel, detect pii entities and sentiment
  3. Recalculate offsets of pii entities based on part number
  4. Consolidate results from parallel execution
  5. Combine results from each part
4. Calculate average sentiment based on results of each part
5. Publish SNS topic with sentiment and pii detail to notify interested consumers

![State Machine Flow](/contests/2021-Q4_AWS-SDK-Examples/images/flow-diagram.png)

## Submitted By
Allen Helton ([@allenheltondev](https://github.com/allenheltondev))
