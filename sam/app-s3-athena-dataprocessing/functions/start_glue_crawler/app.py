# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import random
import os
import boto3
from botocore.exceptions import ClientError

client = boto3.client('glue')

def lambda_handler(event, context):

    if not 'crawler_name' in event:
        raise ValueError("Required input not provided: crawler_name")

    print("Running crawler {}".format(event['crawler_name']))

    try:
        response = client.start_crawler(
            Name=event['crawler_name']
        )
        return response
    except:
        raise

