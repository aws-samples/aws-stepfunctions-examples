""" Module to send the response from workflow to the user through IoT core topic"""
import json
import re
import boto3


def lambda_handler(event, context):
    """Lambda handler to send message to IoT topic. Sends title and description to the client in the first call. Sends avatar presigned url in the second call"""

    iotClient = boto3.client("iot-data")
    payload = {}
    if event["type"] == "avatar":
        s3URI = event["avatar_uri"]
        regex = re.findall(r"s3://([^/]+)/(.*?([^/]+)/?)$", s3URI)
        s3_client = boto3.client("s3")
        params = {"Bucket": regex[0][0], "Key": regex[0][1]}
        response = s3_client.generate_presigned_url(
            "get_object", Params=params, ExpiresIn=3600
        )
        payload["downloadURL"] = response
        iotClient.publish(topic=event["input"]["topic"], payload=json.dumps(payload))
    else:
        payload["message"] = event["response_payload"]
        payload["token"] = event["taskToken"]
        iotClient.publish(topic=event["input"]["topic"], payload=json.dumps(payload))
