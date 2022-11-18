import { Duration, PhysicalName, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, ITable, Table } from "aws-cdk-lib/aws-dynamodb";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Choice, Condition, IStateMachine, JsonPath, LogLevel, Pass, StateMachine, StateMachineType, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import { CallAwsService, DynamoAttributeValue, DynamoGetItem, LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { Constants } from "../../core/constants";
import { LambdaLayerAdapter } from "./lambda-layer-adapter";
import { NodejsFunctionAdapter } from "./nodejs-function-adapter";

interface SecretCacheProps {
}

export class SecretCacheWorkflow extends Construct {

    public readonly secret: ISecret;
    public readonly table: ITable;
    public readonly stateMachine: IStateMachine;

    constructor(scope: Construct, id: string, props?: SecretCacheProps) {
        super(scope, id);

        // dynamo db table that stores execution details
        this.table = new Table(this, 'SecretCacheTable', {
            partitionKey: {
                name: 'SecretArn',
                type: AttributeType.STRING
            },
            removalPolicy: RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'TimeToLive'
        });

        // setting up a lambda layer for common dependencies
        const layer = new LambdaLayerAdapter(this, 'Utils', {
            layerName: Constants.Resources.Layers.UtilsLayer
        });

        const lambda = new NodejsFunctionAdapter(this, 'CacheSecretLambda', {
            functionPath: Constants.Resources.LambdaPath.CacheSecretLambda,
            layers: [layer.layer],
            env: {
                'SECRET_CACHE_TABLE': this.table.tableName
            }
        });
        // allow lambda to write to ddb
        this.table.grantWriteData(lambda.lambda);

        const stack = Stack.of(this);

        const logGroup = new LogGroup(this, 'SecretCacheWorkflowLogGroup', {
            logGroupName: `/aws/vendedlogs/states/secret-cache-workflow-${stack.stackName}`,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY
        });

        const tryGetSecret = new DynamoGetItem(this, 'TryGetSecretFromCache', {
            resultPath: '$.secretValue',
            outputPath: '$',
            key: { SecretArn: DynamoAttributeValue.fromString(JsonPath.stringAt("$.secretArn")) },
            table: this.table
        });

        const isSecretCached = new Choice(this, 'IsSecretCached', {});
        tryGetSecret.next(isSecretCached);

        const returnResult = new Pass(this, 'ReturnResult', {
            parameters: {
                'secretValue': JsonPath.stringAt("$.secretValue.Item.SecretValue.S")
            },
            outputPath: "$"
        });

        isSecretCached.when(Condition.isPresent("$.secretValue.Item.SecretValue.S"), returnResult);

        const getSecret = new CallAwsService(this, 'GetSecretValue', {
            service: 'secretsmanager',
            action: 'getSecretValue',
            resultPath: '$.secretValue.Item.SecretValue',
            resultSelector: {
                "S.$": "$.SecretString"
            },
            outputPath: '$',
            iamAction: 'secretsmanager:getSecretValue',
            iamResources: [`arn:aws:secretsmanager:${stack.region}:${stack.account}:secret:*`], // have to use the '*' here
            parameters: {
                SecretId: JsonPath.stringAt("$.secretArn")
            }
        });
        isSecretCached.otherwise(getSecret);

        const saveSecret = new LambdaInvoke(this, 'CacheSecret', {
            lambdaFunction: lambda.lambda,
            timeout: Duration.seconds(15),
            payload: TaskInput.fromJsonPathAt("$"),
            resultSelector: {
                "SavedExecution.$": "$.Payload"
            },
            resultPath: '$.lambdaResult'
        })

        getSecret.next(saveSecret);

        const secretNotFound = new Pass(this, "SecretNotFound", {
            parameters: {
                'error': 'INVALID_SECRET_ARN'
            }
        });
        getSecret.addCatch(secretNotFound, {
            errors: ['SecretsManager.ResourceNotFoundException']
        });
        saveSecret.next(returnResult);

        this.stateMachine = new StateMachine(this, 'SecretCacheWorkflow', {
            definition: tryGetSecret,
            stateMachineName: PhysicalName.GENERATE_IF_NEEDED,
            timeout: Duration.seconds(30),
            tracingEnabled: true,
            stateMachineType: StateMachineType.EXPRESS,
            logs: {
                level: LogLevel.ALL,
                destination: logGroup,
                includeExecutionData: true
            }
        });
    }
}