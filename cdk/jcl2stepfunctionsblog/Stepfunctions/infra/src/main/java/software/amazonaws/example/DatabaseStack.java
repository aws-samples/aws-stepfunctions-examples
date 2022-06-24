// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example;

import lombok.Getter;
import software.amazon.awscdk.*;
import software.amazon.awscdk.customresources.Provider;
import software.amazon.awscdk.customresources.ProviderProps;
import software.amazon.awscdk.services.ec2.*;
import software.amazon.awscdk.services.iam.*;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.FunctionProps;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.rds.*;
import software.amazon.awscdk.services.rds.InstanceProps;
import software.amazon.awscdk.services.secretsmanager.Secret;
import software.amazon.awscdk.services.secretsmanager.SecretProps;
import software.amazon.awscdk.services.secretsmanager.SecretStringGenerator;
import software.constructs.Construct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Map;

public class DatabaseStack extends Stack {

    @Getter
    private Vpc vpc;

    @Getter
    private SecurityGroup lambdaSecurityGroup;

    @Getter
    private Role lambdaRole;

    @Getter
    private String rdsProxyEndpoint;

    public DatabaseStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public DatabaseStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        this.vpc = new Vpc(this, "TheVPC", VpcProps.builder()
                .maxAzs(2)
                .build());


        Secret rdsSecret = new Secret(this, "RDSSecret", SecretProps.builder()
                .secretName("rds-credentials")
                .generateSecretString(SecretStringGenerator.builder()
                        .excludePunctuation(true)
                        .passwordLength(16)
                        .generateStringKey("password")
                        .secretStringTemplate("{\"username\": \"" + DBConstants.DB_USER_NAME + "\"}")
                        .build())
                .build());

        SecurityGroup rdsSecurityGroup = new SecurityGroup(this, "RDSSecurityGroup", SecurityGroupProps.builder()
                .allowAllOutbound(true)
                .securityGroupName("JCLBlog-RDSSecurityGroup")
                .vpc(vpc)
                .build());

        DatabaseCluster rdsCluster = new DatabaseCluster(this, "RDSCluster", DatabaseClusterProps.builder()
                .engine(DatabaseClusterEngine.AURORA_MYSQL)
                .credentials(Credentials.fromSecret(rdsSecret))
                .instances(1)
                .defaultDatabaseName(DBConstants.DB_NAME)
                .instanceProps(InstanceProps.builder()
                        .instanceType(InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.SMALL))
                        .securityGroups(Arrays.asList(rdsSecurityGroup))
                        .allowMajorVersionUpgrade(true)
                        .vpc(vpc)
                        .vpcSubnets(SubnetSelection.builder()
                                .subnetType(SubnetType.PRIVATE_WITH_NAT)
                                .build())
                        .build())
                .build());

        Role proxyRole = new Role(this, "proxyRole", RoleProps.builder()
                .roleName("JCLBlog-RDSProxyRole")
                .assumedBy(new ServicePrincipal("rds.amazonaws.com"))
                .build());


        DatabaseProxy proxy = new DatabaseProxy(this, "RDSProxy", DatabaseProxyProps.builder()
                .proxyTarget(ProxyTarget.fromCluster(rdsCluster))
                .securityGroups(Arrays.asList(rdsSecurityGroup))
                .secrets(Arrays.asList(rdsSecret))
                .role(proxyRole)
                .iamAuth(true)
                .requireTls(true)
                .vpc(vpc)
                .build());

        //Self referencing group for RDS Proxy
        rdsSecurityGroup.addIngressRule(rdsSecurityGroup, Port.tcp(Integer.parseInt(DBConstants.DB_PORT)));

        this.lambdaSecurityGroup = new SecurityGroup(this, "LambdaSecurityGroup", SecurityGroupProps.builder()
                .allowAllOutbound(true)
                .securityGroupName("JCLBlog-LambdaSecurityGroup")
                .vpc(vpc)
                .build());

        //Access from lambda to RDS Proxy
        rdsSecurityGroup.addIngressRule(lambdaSecurityGroup, Port.tcp(Integer.parseInt(DBConstants.DB_PORT)));

        this.lambdaRole = new Role(this, "LambdaRole", RoleProps.builder()
                .assumedBy(new ServicePrincipal("lambda.amazonaws.com"))
                .roleName(PhysicalName.GENERATE_IF_NEEDED)
                .build());
        lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
        lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"));
        lambdaRole.addToPolicy(new PolicyStatement(PolicyStatementProps.builder()
                .effect(Effect.ALLOW)
                .actions(Arrays.asList("rds-db:connect"))
                .resources(Arrays.asList("arn:aws:rds-db:"
                                + Stack.of(this).getRegion()
                                + ":"
                                + Stack.of(this).getAccount()
                                + ":dbuser:*"
                                + "/" + DBConstants.DB_USER_NAME
                        )
                )
                .build()));

        Function dbInitFunction = new Function(this, "InitDBLambda", FunctionProps.builder()
                .role(lambdaRole)
                .securityGroups(Arrays.asList(lambdaSecurityGroup))
                .memorySize(1024)
                .vpc(vpc)
                .runtime(Runtime.JAVA_11)
                .vpcSubnets(SubnetSelection.builder()
                        .subnetType(SubnetType.PRIVATE_WITH_NAT)
                        .build())
                .environment(Map.of("END_POINT", proxy.getEndpoint(),
                        "DATABASE_NAME", DBConstants.DB_NAME,
                        "DB_USER_NAME", DBConstants.DB_USER_NAME,
                        "DB_PORT", DBConstants.DB_PORT,
                        "REGION", this.getRegion()))
                .code(Code.fromAsset("../software/Lambda/target/jcl-stepfunctions-sample-1.0.0.jar"))
                .handler("software.amazonaws.example.handler.DBInitLambdaHandler::handleRequest")
                .timeout(Duration.seconds(60))
                .build());

        Provider dbInitProvider = new Provider(this, "DBInitProvider", ProviderProps.builder()
                .onEventHandler(dbInitFunction)
                .build());

        String scriptFile = "scripts/dbinit.sql";
        String sqlScript = "";
        try {
            sqlScript = new String(Files.readAllBytes(Paths.get(scriptFile)));
        } catch (IOException e) {
            System.out.println("DB Initialization Failed !!!");
        }

        CustomResource cr = new CustomResource(this, "InitDBCustomResource", CustomResourceProps.builder()
                .serviceToken(dbInitProvider.getServiceToken())
                .resourceType("Custom::InitDBProvider")
                .properties(Map.of("SqlScript", sqlScript))
                .build());

        cr.getNode().addDependency(proxy);

        this.rdsProxyEndpoint = proxy.getEndpoint();

    }
}
