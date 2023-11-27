from aws_cdk import (
     Stack,
    aws_iot as iot,
    aws_lambda as lambdafun,
    aws_iam as iam,
    CfnOutput as cfn_out

)
from constructs import Construct

class AsyncResponseWithIoT(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        AuthHandlerLambdaExecutionRole = iam.Role(
            self, 'AuthHandlerLambdaExecutionRole',
            assumed_by=iam.ServicePrincipal('lambda.amazonaws.com'),
            role_name="IoTAuthHandlerLambdaExecutionRole_"+self.stack_name,
        )
        AuthHandlerLambdaExecutionRole.add_managed_policy(iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole"))
        
        fnIoTAuthorizer = lambdafun.Function(self, "GenAIAsyncResponseIoTAuthorizer",
            runtime=lambdafun.Runtime.PYTHON_3_9,
            handler="lambda_function.lambda_handler",
            code=lambdafun.Code.from_asset("../../src/iot-authorizer"),
            role=AuthHandlerLambdaExecutionRole,
            function_name="async-response-iot-authorizer-"+self.stack_name,
            environment={
                "ACCOUNT_ID": self.account,
                "REGION":self.region
             }
            )
        
        principal = iam.ServicePrincipal("iot.amazonaws.com")

        fnIoTAuthorizer.grant_invoke(principal)

        iotAuthorizer = iot.CfnAuthorizer(self, 'iotAuthorizer',
                                          authorizer_name="genai-hitl-workflow-iot",
                                          authorizer_function_arn=fnIoTAuthorizer.function_arn,
                                          signing_disabled=True,
                                          status='ACTIVE')
        
        cfn_out(self, id="ExportIoTAuth", export_name="genai-iot-authorizer", value=iotAuthorizer.authorizer_name)

