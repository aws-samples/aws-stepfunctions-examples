import { CfnOutput, PhysicalName, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { SecretCacheWorkflow } from './constructs/secret-cache-workflow';

interface TrustingAccountResourcesStackProps extends StackProps {
  trustedAccountRole: IRole,
  trustedStateMachine: IStateMachine
}

export class TrustingAccountResourcesStack extends Stack {

  public readonly stateMachine: IStateMachine;
  public readonly role: IRole;
  public readonly secret: ISecret;

  constructor(scope: Construct, id: string, props: TrustingAccountResourcesStackProps) {
    super(scope, id, props);

    this.secret = new Secret(this, 'DummySecret', {
      description: 'Dummy Secret',
      secretName: PhysicalName.GENERATE_IF_NEEDED,
      secretStringValue: new SecretValue("1234567890ABCDEFGHIJKLMOPQRSTUVWXYZ")
    });

    this.stateMachine = new SecretCacheWorkflow(this, 'SecretCacheWf').stateMachine;

    new CfnOutput(this, 'SecretCacheWfArn', { value: this.stateMachine.stateMachineArn });

    // creating trusting account role with a trust relationship with source account role
    this.role = new Role(this, 'TrustingAccountRole', {
      assumedBy: props.trustedAccountRole,
      roleName: PhysicalName.GENERATE_IF_NEEDED,
      externalIds: [props.trustedStateMachine.stateMachineArn]
    });

    // allow the role to start the state machine
    this.stateMachine.grantStartSyncExecution(this.role);

    new CfnOutput(this, 'TrustingAccountRoleName', { value: this.role.roleName });
  }
}
