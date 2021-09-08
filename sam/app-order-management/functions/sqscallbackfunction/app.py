# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()

client = boto3.client('stepfunctions')

def lambda_handler(event, context):
    print(event)
    for record in event['Records']:
        payload=record["body"]
        obj = json.loads(payload)

        output = {'shipping_status': 'successful'}
        print("Task token is {}".format(obj['token']))
        response = client.send_task_success(
            taskToken=obj['token'],
            output=json.dumps(output)
        )
        print(response)