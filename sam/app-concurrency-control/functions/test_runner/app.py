# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import random
import boto3
import os

def lambda_handler(event, context):
    sqs = boto3.resource('sqs')
    #insert into sqs queue
    queue = sqs.get_queue_by_name(QueueName='CC-Test-Queue')
    #while loop to send messages
    for i in range(100):
        queue.send_message(MessageBody='test message ' + str(i))