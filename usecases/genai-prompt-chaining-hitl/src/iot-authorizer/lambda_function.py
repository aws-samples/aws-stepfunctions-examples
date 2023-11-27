"""Module providing auth to IoT topic"""

import os

def lambda_handler(event, context):
    
    """ Lambda function to return the authorization for IoT topic """

    ACCOUNT_ID = os.getenv("ACCOUNT_ID")
    REGION = os.getenv("REGION")

    policy = {
        "isAuthenticated": True,
        "principalId": 'Unauthenticated',
        "policyDocuments": [{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": "iot:Connect",
                    "Resource":f"arn:aws:iot:{REGION}:{ACCOUNT_ID}:client/*"
                },
                {
                    "Effect": "Allow",
                    "Action": "iot:Subscribe",
                    "Resource": [
                        f"arn:aws:iot:{REGION}:{ACCOUNT_ID}:topicfilter/*"
                    ]
                },
                {
                "Effect": "Allow",
                    "Action": "iot:Receive",
                    "Resource": [
                        f"arn:aws:iot:{REGION}:{ACCOUNT_ID}:topic/*"
                    ]
                }
            ]
        }],
        "disconnectAfterInSeconds": 3600,
        "refreshAfterInSeconds": 300

    }
    return policy
