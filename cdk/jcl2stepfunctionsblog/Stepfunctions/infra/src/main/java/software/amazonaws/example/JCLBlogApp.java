// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;

public class JCLBlogApp {
    public static void main(final String[] args) {
        App app = new App();

        Environment environment = Environment.builder()
                .account(System.getenv("CDK_DEFAULT_ACCOUNT"))
                .region(System.getenv("CDK_DEFAULT_REGION"))
                .build();

        DatabaseStack dbStack = new DatabaseStack(app, "JCLBlog-DatabaseStack", StackProps.builder()
                .env(environment)
                .build());

        new StateMachineStack(app, "JCLBlog-StateMachineStack", StateMachineStack.StateMachineStackProps.builder()
                .env(environment)
                .lambdaRole(dbStack.getLambdaRole())
                .rdsProxyEndpoint(dbStack.getRdsProxyEndpoint())
                .lambdaSG(dbStack.getLambdaSecurityGroup())
                .vpc(dbStack.getVpc())
                .build());

        app.synth();
    }
}

