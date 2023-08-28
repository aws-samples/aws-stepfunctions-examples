## Description

This example demonstrate the implementation of cross-execution concurrency control for AWS Step Function workflows,  by utlizing the listExecutions() API (https://docs.aws.amazon.com/step-functions/latest/apireference/API_ListExecutions.html). 

Within a single flow, one can utilize Map or Distributed Map state to control how many concurrent flows can be launched within the same execution. However, there are use cases where one may want to limit the number of concurrent executions of the same workflow, for example, due to downstream API limitation or tasks that requires human intervention. 

## Implementation

### Concurrency Controller function: 

The concurrency controller Lambda function will check, for a given SFN ARN, the current number of executions using the listExecutions API. It then compares that against a preset concurrency threshold, a static value stored in SSM Parameter Store (for simplicity), and return a “proceed” or “wait” flag

### Other considrations

* Single SAM template is used to create all resources
* Test runner: Lambda function that generates test messages to SQS (e.g., 1k - 10k)
* SQS provides trigger for Concurrency controller Lambda function, with batch size of 1 and maximum concurrency set to 4 (to avoid ThrottlingException for the API call and racing condition)
* A random delay up to 1 sec (jitter) is introduced when listExecutions is called to avoid racing condition
* Concurrency Threshold set to 10 in SSM Param Store
* listExecution() API call is eventual consistency and results are best effort (no SLA) → Concurrency can exceed threshold value on occasion 
* Concurrency can be tracked using CloudWatch Log Insight

