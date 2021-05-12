# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import random
import os
import boto3
from botocore.exceptions import ClientError

client = boto3.client('glue')

def lambda_handler(event, context):

    if not 'crawler_prefix' in event:
        raise ValueError("Required input not provided: crawler_prefix")

    print("Looking for crawlers with prefix {}".format(event['crawler_prefix']))

    try:
        response = client.list_crawlers(
            MaxResults=500
        )
        crawlers = response["CrawlerNames"]
        crawler_list = []
        for crawler in crawlers:
            if crawler.startswith(event['crawler_prefix']):
                crawler_list.append(crawler)
        return crawler_list
    except:
        raise

