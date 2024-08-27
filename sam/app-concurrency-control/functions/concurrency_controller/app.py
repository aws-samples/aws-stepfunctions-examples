# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import random
import boto3
import os
from botocore.config import Config

config = Config(
   retries = {
      'max_attempts': 10,
      'mode': 'standard'
   }
)

try:
    #get parameter from system manager
    ssm = boto3.client('ssm')
    concurrency_limit_threshold = int(ssm.get_parameter(Name='concurrencyLimit', WithDecryption=True)['Parameter']['Value'])

except:
    print('Failed to get failure threshold from SSM')   


def lambda_handler(event, context):
    #list step function executions
    region = context.invoked_function_arn.split(":")[3]
    account_id = context.invoked_function_arn.split(":")[4]
    arn = 'arn:aws:states:'+ str(region) + ':' + str(account_id) + ':stateMachine:CC-WorkStateMachine'
    print('stepfunction arn:' + str(arn))
    stepfunctions = boto3.client('stepfunctions', config=config)
    records = event['Records']
    for record in records:
        #wait a random amount of time before invoking step function
        time.sleep(random.randint(1,10)*0.1)
        executions = stepfunctions.list_executions(stateMachineArn=arn, statusFilter='RUNNING')
        #get number of executions
        execution_count = len(executions['executions'])
        print('current execution count:' + str(execution_count))
        print('concurrency limit threshold:' + str(concurrency_limit_threshold))

        # Throw and exception if the random number is larger than the specified threshold
        if execution_count >= concurrency_limit_threshold:
            raise Exception('Concurrent workflow reaching limit!')
        else:
            #invoke step function
            print('Processing ' + str(record["body"]))
            stepfunctions.start_execution(stateMachineArn=arn)