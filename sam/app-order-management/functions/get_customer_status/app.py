# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
from random import randrange

from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()



def lambda_handler(event, context):
    #Generate random number between 0 and 9
    rnum = randrange(9)
    if rnum >= 6:
        raise ValueError('Random number was 6 or larger')

    output = {
        "status": "active"
    }

    if 'name' in event:
        name = event['name']
        if 'fraud' in name:
            output['status'] = "fraudulent"

    return(output)