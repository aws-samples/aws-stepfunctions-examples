from aws_cdk import (
    Duration,
    Stack,
    aws_lambda as lambdafun,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as tasks,
    aws_s3 as s3,
    CfnOutput as cfn_out,
    aws_iam as iam
)
from constructs import Construct

import builtins
import typing
import os, subprocess


CLAUDE_HUMAN_PROMPT = """\\n\\nHuman:"""
CLAUDE_AI_PROMPT = """\\n\\nAssistant:"""
TranscriptionJob = "ServerlessVideoGenerativeAI"

class GenerativeAIWorkflow(Stack):
    # sfn_workflow:sfn.StateMachine
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
 
        params = self.node.try_get_context("params")
        connectionArn = params["EB_CONNECTION_ARN"]
        public_inference_endpoint =  params["PUBLIC_INFERENCE_ENDPOINT"]
        
        cors_rule = s3.CorsRule(
            allowed_methods=[s3.HttpMethods.GET],
            allowed_origins=["allowedOrigins"],
            # the properties below are optional
            allowed_headers=["allowedHeaders"],
            exposed_headers=["exposedHeaders"],
            id="id",
            max_age=123
        )


        bucket = s3.Bucket(self, "ReInventVideoBucket-"+self.stack_name,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            cors=[cors_rule]
        )
        cfn_out(self, id="ExportBucketname", export_name="genai-video-bucket", value=bucket.bucket_name)

        SendResponseLambdaRole = iam.Role(
            self,
            'SendResponseLambdaRole',
            assumed_by=iam.ServicePrincipal('lambda.amazonaws.com'),
            role_name="SendResponseLambdaRole_"+self.stack_name,
        )

        SendResponseLambdaRole.attach_inline_policy(
            iam.Policy(self,
                       'SendResponseInlinePolicy',
                       statements=[
                           iam.PolicyStatement(
                               actions=[
                                   'logs:CreateLogGroup',
                                   'logs:CreateLogStream',
                                   'logs:PutLogEvents',
                               ],
                               resources=['*'],
                           ),
                           iam.PolicyStatement(
                               actions=["s3:getObject"],
                               resources=[bucket.bucket_arn,
                                          f"{bucket.bucket_arn}/*"],
                           ),
                           
                           iam.PolicyStatement(
                               actions=["iot:DescribeEndpoint", "iot:Publish"],
                               resources=['*'],
                           ),
                       ]))

        send_response_lambda = lambdafun.Function(
            self,
            "send-response",
            runtime=lambdafun.Runtime.PYTHON_3_9,
            handler="lambda_function.lambda_handler",
            code=lambdafun.Code.from_asset("../../src/send-response"),
            function_name="send-response-"+self.stack_name,
            timeout=Duration.seconds(20),
            role=SendResponseLambdaRole,
            memory_size=256,

        )

        StateMachineRole = iam.Role(
            self,
            'StateMachineRole',
            assumed_by=iam.ServicePrincipal('states.amazonaws.com'),
            role_name="StateMachineRole_"+self.stack_name,
        )

        StateMachineRole.attach_inline_policy(
            iam.Policy(self,
                       'StateMachineRoleInlinePolicy',
                       statements=[
                           iam.PolicyStatement(
                               actions=[
                                   'logs:CreateLogGroup',
                                   'logs:CreateLogStream',
                                   'logs:PutLogEvents',
                               ],
                               resources=['*'],
                           ),
                           
                           iam.PolicyStatement(
                               actions=["Bedrock:InvokeModel"],
                               resources=[
                                    f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-instant-v1",
                                    f"arn:aws:bedrock:{self.region}::foundation-model/anthropic.claude-v2",
                                    f"arn:aws:bedrock:{self.region}::foundation-model/stability.stable-diffusion*",


                               ],
                           ),
                           iam.PolicyStatement(
                               actions=["lambda:invokeFunction"],
                               resources=[
                                    send_response_lambda.function_arn
                               ],
                           ),
                            iam.PolicyStatement(
                               actions=["s3:getObject*",
                                        "s3:putObject",
                                        "s3:ListBucket"
                                        ],
                               resources=[bucket.bucket_arn,
                                          f"{bucket.bucket_arn}/*"],
                           ),                         
                           iam.PolicyStatement(
                               actions=[
                                   "Transcribe:startTranscriptionJob",
                                   "Transcribe:getTranscriptionJob"],
                               resources=[
                                    f"arn:aws:transcribe:{self.region}:{self.account}:transcription-job/{TranscriptionJob}*",
                               ],
                           ),

                           iam.PolicyStatement(
                               actions=[
                                   "states:InvokeHTTPEndpoint"
                               ],
                               resources=["*"]
                           ),
                           iam.PolicyStatement(
                               actions=[
                                    "events:RetrieveConnectionCredentials"
                               ],
                               resources=[connectionArn]
                           ),
                            iam.PolicyStatement(
                               actions=[
                                "secretsmanager:DescribeSecret",
                                "secretsmanager:GetSecretValue"
                               ],
                               resources=[f"arn:aws:secretsmanager:{self.region}:{self.account}:secret:events!connection/*"]
                           ),

                       ]))

        self.sfn_workflow = sfn.StateMachine(
            self, 'serverlessVideoGenerativeAI*',        
            definition_body= sfn.DefinitionBody.from_file('../../src/workflow.asl.json'),
            definition_substitutions={
                "TranscriptionJob":TranscriptionJob,
                "send_response_lambda":send_response_lambda.function_arn,
                "bucket":bucket.bucket_name,
                "key":"bezos-vogels.mp4",
                "eb_connection_arn":connectionArn,
                "region":self.region,
                "public_inference_endpoint":public_inference_endpoint
            },
            role=StateMachineRole
        )




