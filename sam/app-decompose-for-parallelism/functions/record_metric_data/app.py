# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
from botocore.config import Config

# Set a low number of retries for Metrics so that this will fall back to SFN retries more quickly
config = Config (
    retries=dict(
        max_attempts=2
    )
)
cloudwatch = boto3.client('cloudwatch',config=config)

def lambda_handler(event, context):
    
    # Get Input
    input = event['Input']
    
    val = input['Value']
    if (isinstance(val, str)):
        val = int(val)

    # Create object with metric data. 
    MetricData = [
        {
            'MetricName': input['MetricName'],
            'Dimensions': input['Dimensions'],
            'Unit': input['Unit'],
            'Value': val
        }
        
    ]
    print(MetricData)
    
    response = cloudwatch.put_metric_data(MetricData = MetricData,Namespace = input['Namespace'])