# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import time
import random
import os
import uuid 
import boto3

# Initialize S3 client
s3_client = boto3.client('s3')

def lambda_handler(event, context):

    # Get the S3 bucket name from the input
    s3_bucket = event.get('s3_bucket')
    print("bucket is {}".format(s3_bucket))

    # Get the S3 key name for the batch info from the input
    s3_key = event.get('s3_key')
    print("key is {}".format(s3_key))

    # Get the batch id from the input
    batch_id = int(event.get('batch_id'))
    print("batch_id is {}".format(batch_id))

    # Load the full data from S3
    response = s3_client.get_object(
        Bucket=s3_bucket,
        Key=s3_key
    )
    batch_data = response['Body'].read().decode('utf-8')

    # Look for the batch in question and return it
    batch_data_obj = json.loads(batch_data)
    test_batch = batch_data_obj['test-batches'][batch_id]

    return test_batch
