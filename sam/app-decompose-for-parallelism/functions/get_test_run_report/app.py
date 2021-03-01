# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
from boto3.dynamodb.conditions import Key

client = boto3.client('dynamodb')

def lambda_handler(event, context):
    
    ip = event["Input"]
    table_name = ip["table_name"]
    test_run_id = ip["event_run_id"]
    
    print("Querying for results for test_run_id {}".format(test_run_id))
    response = client.query(
        TableName = table_name ,
        KeyConditions  = {
            'TestRunId': {
                "ComparisonOperator":"EQ",
                'AttributeValueList': [{'S': test_run_id }]
                
            }
        }
    )
    
    items = response["Items"]
    
    # Dymamo will limit responses to 1 MB in size. If there is more data to get, the LastEvaluatedKey will indicate this and can be used to get the next batch
    while 'LastEvaluatedKey' in response:
        print("\tGetting batch of results for test_run_id {}".format(test_run_id))
        response = client.query(
            TableName = table_name ,
            KeyConditions  = {
                'TestRunId': {
                    "ComparisonOperator":"EQ",
                    'AttributeValueList': [{'S': test_run_id }]
                    
                }
            },
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response['Items'])

    test_count = 0
    successful_tests = 0
    failed_tests = 0
    fastest_test = -1
    slowest_test = -1
    total_test_time = 0

    print("Processing results for test_run_id {}".format(test_run_id))
    max_size = 240 * 1024
    results_truncated = False
    res = []
    for i in items:
        row = {"TestId": '', "TestName": '', "TestStatus": '', "TestDurationMs": 0}
        row["TestId"] = i["TestId"]["S"].split(':')[-1]
        row["TestName"] = i["TestName"]["S"]
        row["TestStatus"] = i["TestStatus"]["S"]
        row["TestDurationMs"] = int(i["TestDurationMs"]["N"])

        # maintain summary info
        test_count += 1
        total_test_time += row["TestDurationMs"]
        if 'SUCCE' in row["TestStatus"].upper():
            successful_tests += 1
        else:
            failed_tests += 1

        if fastest_test == -1 or fastest_test > row["TestDurationMs"]:
            fastest_test = row["TestDurationMs"]
        
        if slowest_test == -1 or slowest_test < row["TestDurationMs"]:
            slowest_test = row["TestDurationMs"]

        if results_truncated == False:           
            if len(json.dumps(res).encode('utf-8')) < max_size:
                res.append(row)
            else:
                results_truncated = True
    
    average_duration = -1
    if test_count > 0:
        average_duration = total_test_time / test_count

    summary = {
        'test_count': test_count,
        'successful_count': successful_tests,
        'failed_count': failed_tests,
        'average_duration_ms': average_duration,
        'fastest_test_ms': fastest_test,
        'slowest_test_ms': slowest_test, 
        'results_truncated': results_truncated
    }

    

    resp = {'summary': summary,'test_results': res}

    return resp
