import os
import json
import boto3

sfn = boto3.client("stepfunctions")
stateMachineArn = os.environ.get("STATE_ARN")


def lambda_handler(event, context):
    """Lambda event handler. Invokes workflow."""

    for record in event["Records"]:
        request = json.loads(record["body"])
        input = {"input": request}
        if "token" in request:
            input["token"] = request["token"]
            sfn.send_task_success(
                stateMachineArn=stateMachineArn, input=json.dumps(input)
            )
        else:
            sfn.start_execution(
                stateMachineArn=stateMachineArn, input=json.dumps(input)
            )
