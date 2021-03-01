# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import time
import random
import os
import uuid 
import boto3

# Initialize the s3 client
s3_client = boto3.client('s3')

# Build the list of available build projects
test_statemachines = []
for k in os.environ:
    if 'test_statemachine_' in k:
        test_name = k.replace('test_statemachine_','')
        test_statemachines.append({"name": test_name})

def lambda_handler(event, context):

    # Get the number of iterations, default to 1 if not provided
    iteration_count = event.get('iteration_count',1)
    print("Iteration count is {}".format(iteration_count))

    # Get the execution name, default to a guid if not provided
    execution_name = event.get('execution_name',uuid.uuid4())

    # Set the maximum number of batches
    max_batches = 40

    # Get the name of the s3 bucket to put things in from an environment variable
    s3_bucket = ''
    for k in os.environ:
        if k.lower() == 's3bucket':
            s3_bucket = os.environ[k]
    
    # Build the list of available test statemachines from environment variables.
    test_statemachines = []
    for k in os.environ:
        if 'test_statemachine_' in k:
            test_name = k.replace('test_statemachine_','')
            test_statemachines.append({"name": test_name})

    # Build the result
    print("Building results for {} iterations.".format(iteration_count))
    batches = []
    for i in range(iteration_count):
        # Determine the batch id for this iteration by mod of max_batches
        bid = i % max_batches

        # Start an object for this batch
        batch = {}
        if bid < len(batches):
            # Then this batch exists already. Get the existing batch object
            batch = batches[bid]
        else:
            # Then this is a new batch. Initalize the batch object
            batch = {"batchnumber": bid,"tests-to-run": []}
            batches.append(batch)

        # Pick a statemachine from the list of available machines to run
        test_to_run = test_statemachines[i % len(test_statemachines)]

        # Get the existing list of tests to run
        tests_list = batch["tests-to-run"]

        # Generate the input for this test. A delay-seconds value between 1 and 5
        test_input = {
            "delay-seconds": random.randint(1,5)
        }

        # Build the test object
        test = {"test-number": i,"test-input": test_input,"test-name": test_to_run["name"]}
        
        # Add it to the list
        tests_list.append(test)

        # Re-set the list for this batch
        batch["tests-to-run"] = tests_list

        # Re-set the batch on the collection of batches
        batches[bid] = batch

    # Create an index of batches 
    batch_index = []
    for b in batches:
        batch_index.append(b['batchnumber'])

    print("Writing results to S3")
    # Put the batch info to s3
    s3_key = 'execution_input/{}.json'.format(execution_name)
    return_object = {"test-batches": batches,"batch_index": batch_index,"s3_bucket":s3_bucket,"s3_key": s3_key}
    response = s3_client.put_object(
        Bucket=s3_bucket,
        Key=s3_key,
        Body=json.dumps(return_object)
    )

    print("Clearing test batches from return data")
    del return_object["test-batches"]

    return return_object
