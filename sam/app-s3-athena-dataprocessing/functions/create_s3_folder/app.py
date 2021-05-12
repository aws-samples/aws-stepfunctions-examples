# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import random
import os
import boto3
from botocore.exceptions import ClientError

bucket_name = os.environ['bucketname']
s3 = boto3.client('s3')

def lambda_handler(event, context):

    if not 'folder_path' in event:
        raise ValueError("Required input not provided: folder_path")

    print("Looking for {} in {}".format(event['folder_path'],bucket_name))

    try:
        obj = s3.head_object(Bucket=bucket_name, Key=event['folder_path'])
        return "exists"
    except ClientError as exc:
        if exc.response['Error']['Code'] == '404':
            obj = s3.put_object(Bucket=bucket_name, Key=(event['folder_path']))
            return "created"
        else:
            raise exc

