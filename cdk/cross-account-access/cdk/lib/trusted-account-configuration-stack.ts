import { Stack, StackProps } from 'aws-cdk-lib';
import { Effect, IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IParameter } from 'aws-cdk-lib/aws-ssm';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

interface TrustedAccountConfigurationStackProps extends StackProps {
    trustedAccountRole: IRole,
    trustedStateMachine: IStateMachine,
    trustingAccountRole: IRole,
    trustingStateMachine: IStateMachine,
    parameter: IParameter,
    secret: ISecret
}

export class TrustedAccountConfigurationStack extends Stack {

    constructor(scope: Construct, id: string, props: TrustedAccountConfigurationStackProps) {
        super(scope, id, props);

        props.trustedAccountRole.attachInlinePolicy(new Policy(this, 'allow-assume-trusting-role', {
            statements: [
                new PolicyStatement({
                    actions: ['sts:AssumeRole'],
                    effect: Effect.ALLOW,
                    resources: [props.trustingAccountRole.roleArn]
                })
            ]
        }));

        const setParameter = new AwsCustomResource(this, 'SetParameter', {
            onUpdate: { // will also be called for a CREATE event
                service: 'SSM',
                action: 'putParameter',
                parameters: {
                    Name: props.parameter.parameterName,
                    Value: JSON.stringify({
                        secret: {
                            secretArn: props.secret.secretArn
                        },
                        trustingAccountRoleArn: props.trustingAccountRole.roleArn,
                        trustingAccountWorkflowArn: props.trustingStateMachine.stateMachineArn
                    }),
                    Type: 'String',
                    Overwrite: true
                },
                physicalResourceId: PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({
                // resources: AwsCustomResourcePolicy.ANY_RESOURCE,
                resources: [props.parameter.parameterArn]
            }),
        });
    }
}