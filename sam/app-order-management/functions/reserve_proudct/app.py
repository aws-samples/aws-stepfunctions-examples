# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
from random import randrange
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()



def lambda_handler(event, context):
    product_id = event["product_id"]

    output = {
        "product_id": product_id, 
        "reservation_status": "success",
        "reservation_id": 23141324213452132000
    }
    #Generate random number between 0 and 9
    rnum = randrange(9)
    if rnum >= 5:
        output["reservation_status"] = "temporarily-unavailable"

    return(output)