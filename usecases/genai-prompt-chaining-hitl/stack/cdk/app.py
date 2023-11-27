
#!/usr/bin/env python3
import os

import aws_cdk as cdk

from api_stack import ApigwSqsLambdaStack
from sfn_workflow_stack import GenerativeAIWorkflow
import aws_cdk as cdk
from iot import AsyncResponseWithIoT

app = cdk.App()
workflow = GenerativeAIWorkflow(app, "genai-prompt-chaining-hitl-workflow")
ApigwSqsLambdaStack(app, "genai-prompt-chaining-api", sfn_workflow=workflow.sfn_workflow)
AsyncResponseWithIoT(app, "genai-async-response-iot")
app.synth()