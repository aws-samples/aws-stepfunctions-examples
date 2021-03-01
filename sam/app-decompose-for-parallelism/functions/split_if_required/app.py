# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import time
import random
import os
import uuid 
import boto3

s3_client = boto3.client('s3')

def lambda_handler(event, context):

    # Get the test to be run
    tests_to_run = event.get('tests-to-run')
    print("Tests To Run is {}".format(tests_to_run))

    # Set the max per batch
    max_per_batch = 40

    return_value = event
    
    # If the list includes more than the maximum number of tests, then split into batches. Otherwise return the data as is.
    if len(tests_to_run) > max_per_batch:
        test_batches = []
        current_batch = {"batch_id": 0,"tests-to-run": []}
        added = 0
        for t in tests_to_run:
            current_batch['tests-to-run'].append(t)
            added = 0
            if len(current_batch['tests-to-run']) >= max_per_batch:
                test_batches.append(current_batch)
                new_batch_id = current_batch['batch_id'] + 1
                current_batch = {"batch_id": new_batch_id,"tests-to-run": []}
                added = 1
        if added == 0:
            test_batches.append(current_batch)
            
        del return_value['tests-to-run']
        return_value["test-batches"] = test_batches            


    return return_value
