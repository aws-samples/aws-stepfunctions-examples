// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example;

import lombok.Getter;
import lombok.Setter;
import software.amazon.awscdk.*;
import software.amazon.awscdk.services.ec2.SecurityGroup;
import software.amazon.awscdk.services.ec2.SubnetSelection;
import software.amazon.awscdk.services.ec2.SubnetType;
import software.amazon.awscdk.services.ec2.Vpc;
import software.amazon.awscdk.services.events.*;
import software.amazon.awscdk.services.events.targets.SfnStateMachine;
import software.amazon.awscdk.services.events.targets.SfnStateMachineProps;
import software.amazon.awscdk.services.iam.IRole;
import software.amazon.awscdk.services.lambda.*;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.s3.*;
import software.amazon.awscdk.services.ssm.StringParameter;
import software.amazon.awscdk.services.ssm.StringParameterProps;
import software.amazon.awscdk.services.stepfunctions.*;
import software.amazon.awscdk.services.stepfunctions.tasks.*;
import software.constructs.Construct;

import java.util.Arrays;
import java.util.Map;

public class StateMachineStack extends Stack {

    @lombok.Builder
    @Setter
    @Getter
    public static class StateMachineStackProps implements StackProps {
        private Vpc vpc;
        private IRole lambdaRole;
        private SecurityGroup lambdaSG;
        private String rdsProxyEndpoint;
        private Environment env;
    }


    public StateMachineStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public StateMachineStack(final Construct scope, final String id, final StateMachineStackProps props) {
        super(scope, id, props);

        CfnParameter cfnParameter = CfnParameter.Builder.create(this, "environamentName")
                .type("String")
                .description("Deployment environment. Example : Production")
                .defaultValue("Production")
                .build();

        Bucket s3Bucket = new Bucket(this, "S3Bucket", BucketProps.builder()
                .publicReadAccess(false)
                .build());
        CfnBucket bucket = (CfnBucket) s3Bucket.getNode().getDefaultChild();

        StringParameter ssmParam = StringParameter.Builder.create(this, "exampleSSMParam")
                .parameterName("MyEnvironment")
                .stringValue(cfnParameter.getValueAsString())
                .build();

        bucket.addPropertyOverride("NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled", true);

        Function findEmployeesFunction = new Function(this, "EmployeeLambda", FunctionProps.builder()
                .role(props.getLambdaRole())
                .securityGroups(Arrays.asList(props.getLambdaSG()))
                .memorySize(1024)
                .vpc(props.getVpc())
                .runtime(Runtime.JAVA_11)
                .vpcSubnets(SubnetSelection.builder()
                        .subnetType(SubnetType.PRIVATE_WITH_NAT)
                        .build())
                .environment(Map.of("END_POINT", props.getRdsProxyEndpoint(),
                        "DATABASE_NAME", DBConstants.DB_NAME,
                        "DB_USER_NAME", DBConstants.DB_USER_NAME,
                        "DB_PORT", DBConstants.DB_PORT,
                        "REGION", this.getRegion()))
                .code(Code.fromAsset("../software/Lambda/target/jcl-stepfunctions-sample-1.0.0.jar"))
                .handler("software.amazonaws.example.handler.EmployeeLambdaHandler::handleRequest")
                .timeout(Duration.seconds(20))
                .tracing(Tracing.ACTIVE)
                .build());

        EventBus bus = new EventBus(this, "MyEventBus", EventBusProps.builder()
                .eventBusName("EmployeeEventBus")
                .build());

        Succeed succeedState = new Succeed(this, "Success");

        CallAwsService callSSM = new CallAwsService(this, "GetSSMParam", CallAwsServiceProps.builder()
                .service("ssm")
                .action("getParameter")
                .parameters(Map.of("Name", "MyEnvironment"))
                .resultSelector(Map.of("name.$", "$.Parameter.Value"))
                .resultPath("$.environment")
                .iamResources(Arrays.asList(ssmParam.getParameterArn()))
                .build()
        );

        CallAwsService callS3 = new CallAwsService(this, "S3GetObjectCall", CallAwsServiceProps.builder()
                .service("s3")
                .action("getObject")
                .parameters(Map.of("Bucket.$", "$.detail.bucket.name", "Key.$", "$.detail.object.key"))
                .resultSelector(Map.of("body.$", "$.Body"))
                .iamResources(Arrays.asList(s3Bucket.getBucketArn(), s3Bucket.getBucketArn() + "/*"))
                .build()
        );

        EventBridgePutEvents eventBridgePutEvents = new EventBridgePutEvents(this, "PublishEmployeeEvent", EventBridgePutEventsProps.builder()
                .entries(Arrays.asList(
                        EventBridgePutEventsEntry.builder()
                                .eventBus(bus)
                                .detail(TaskInput.fromJsonPathAt("$"))
                                .detailType("MissingEmployees")
                                .source("EmployeeStepFunction")
                                .build()
                        )
                )
                .build());

        StateMachine stateMachine = StateMachine.Builder.create(this, "MyStateMachine")
                .definition(
                        callS3.next(new Choice(this, "Empty File?")
                                .when(Condition.stringEquals("$.body", ""), succeedState)
                                .otherwise(
                                        LambdaInvoke.Builder.create(this, "FindEmployeesTask")
                                                .lambdaFunction(findEmployeesFunction)
                                                .resultSelector(Map.of("Payload.$", "$.Payload"))
                                                .build()
                                                .next(new Choice(this, "New Employee Records?")
                                                        .when(Condition.isPresent("$.Payload[0]"),
                                                                callSSM.next(
                                                                        new Choice(this, "Dev Environment?")
                                                                                .when(Condition.stringEquals("$.environment.name", "Development"), succeedState)
                                                                                .otherwise(eventBridgePutEvents.next(succeedState))
                                                                )
                                                        )
                                                        .otherwise(succeedState)
                                                )
                                )
                        )

                )
                .tracingEnabled(true)
                .build();

        s3Bucket.grantRead(stateMachine);

        Rule rule = new Rule(this, "StepFunctionTriggerRule", RuleProps.builder()
                .ruleName("JclBlogStepFunctionTriggerRule")
                .eventPattern(EventPattern.builder()
                        .source(Arrays.asList("aws.s3"))
                        .detailType(Arrays.asList("Object Created"))
                        .detail(Map.of("bucket", Map.of("name", Arrays.asList(s3Bucket.getBucketName()))))
                        .build())
                .targets(Arrays.asList(new SfnStateMachine(stateMachine, SfnStateMachineProps.builder()
                        .retryAttempts(2)
                        .build())))
                .build());

        CfnOutput output = new CfnOutput(this, "S3BucketName", CfnOutputProps.builder()
                .value(s3Bucket.getBucketName())
                .build());

    }

}
