# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import sys

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
        "TestSuccessMetricValue": 0,
        "test-run-id": "",
        "Iteration": ""
    }

    idx = {
        "StartDate": ["TestStartTimeEpoch",'','str'],
        "StopDate": ["TestEndTimeEpoch",'','str'],
        "Status": ["TestStatus",'','str'],
        "StateMachineArn": ["StateMachineArn",'','str'],
        "Name": ["Iteration",'','str'],
        "test-run-id": ["test-run-id",'unknown','str']
    }

    list_to_process = [event]
    while len(list_to_process) > 0:
        this_item = list_to_process.pop(0)
        if isinstance(this_item,dict):
            for key in this_item:
                #print("Looking at {} in {}".format(key,this_item))
                if key in idx:
                    k_info = idx[key]
                    if res[k_info[0]] == '':
                        val = this_item[key]
                        #print("\t!!!Found key {}".format(key))                      
                        if k_info[2] == 'str':
                            val = str(val)
                        elif k_info[2] == 'int':
                            val = int(val)
                        res[k_info[0]] = val
                elif isinstance(this_item[key],dict):
                    #print("\tValue is a dict, so adding to the list for further processing")
                    list_to_process.append(this_item[key])


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