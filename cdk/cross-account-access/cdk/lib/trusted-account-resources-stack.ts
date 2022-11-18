import { CfnOutput, Duration, PhysicalName, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { IRole, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CfnStateMachine, IStateMachine, LogLevel, Pass, StateMachine, StateMachineType } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { StateDefinition } from './constructs/state-definition';

export class TrustedAccountResourcesStack extends Stack {

    public readonly stateMachine: IStateMachine;
    public readonly role: IRole;
    public readonly param: IParameter;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.role = new Role(this, 'TrustedAccountRole', {
            assumedBy: new ServicePrincipal('states.amazonaws.com'),
            roleName: PhysicalName.GENERATE_IF_NEEDED
        });

        new CfnOutput(this, 'TrustedAccountRoleName', { value: this.role.roleName });

        const logGroup = new LogGroup(this, 'SecretCacheConsumerWfLogGroup', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY
        });

        this.param = new StringParameter(this, 'CacheConsumerWorkflowConfiguration', {
            stringValue: 'EMPTY'
        });

        this.param.grantRead(this.role);

        this.stateMachine = new StateMachine(this, 'SecretCacheConsumerWf', {
            role: this.role,
            stateMachineName: PhysicalName.GENERATE_IF_NEEDED,
            timeout: Duration.seconds(15),
            tracingEnabled: true,
            stateMachineType: StateMachineType.STANDARD,
            logs: {
                level: LogLevel.ALL,
                destination: logGroup,
                includeExecutionData: true
            },
            definition: new Pass(this, 'Dummy') // will be replaced on line 58
        });

        // temporary workaround since `Credentials` field is not supported by CDK as of yet
        const cfnStateMachine = this.stateMachine.node.defaultChild as CfnStateMachine;
        const definition = new StateDefinition(this.param);
        cfnStateMachine.addOverride('Properties.DefinitionString', definition.generateDefinition());

        new CfnOutput(this, 'SecretCacheConsumerWfArn', { value: this.stateMachine.stateMachineArn });
    }
}
