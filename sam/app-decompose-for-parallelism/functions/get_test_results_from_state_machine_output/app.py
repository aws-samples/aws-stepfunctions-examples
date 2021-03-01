# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import sys
import nested_lookup

def lambda_handler(event, context):

    # If this was a failure, then I need to update the event because the response from Step Functions will be in the Cause field
    if 'Cause' in event:
        print("Looks like a failure. Parsing out the info I need from the Cause field.")
        event = json.loads(event['Cause'])
        event['Input'] = json.loads(event['Input'])

    # Intiailize an object to populate for the result
    res = {
        "TestStartTimeEpoch": "",
        "TestEndTimeEpoch": "",
        "TestDurationMs": "",
        "TestStatus": "",
        "StateMachineArn": "",
        "TestName": "",
        "TestFaultMetricValue": 1,
        "TestSuccessMetricValue": 0
    }

    # Create a list of properties to look for in the event that was passed in
    idx = {
        "TestStartTimeEpoch": ["StartDate",'','str'],
        "TestEndTimeEpoch": ["StopDate",'','str'],
        "TestStatus": ["Status",'','str'],
        "StateMachineArn": ['StateMachineArn','','str'],
        "Iteration": ["Name",'','str'],
        "test-run-id": ["test-run-id",'unknown','str']
    }

    # For each of the properties in the lookup list, look recursively through the event provided
    for k in idx:
        print("Looking for {}".format(k))
        k_info = idx[k]
        try:
            val = nested_lookup.nested_lookup(k_info[0],event)[0]
            print("Found key {}".format(k_info[0]))
            if k_info[2] == 'str':
                val = str(val)
            elif k_info[2] == 'int':
                val = int(val)
            res[k] = val
        except:
            print("Couldn't find key {} in event {}".format(k_info[0],event))
            res[k] = k_info[1]
    
    # Update additional properties based on the ones extracted above
    res["TestDurationMs"] = str(int(res["TestEndTimeEpoch"]) - int(res["TestStartTimeEpoch"])  )  
    res["TestName"] = res["StateMachineArn"].split(':')[-1]

    if res["TestStatus"] == "SUCCEEDED":
        res["TestFaultMetricValue"] = 0
        res["TestSuccessMetricValue"] = 1
    else:
        res["TestFaultMetricValue"] = 1
        res["TestSuccessMetricValue"] = 0

    return res