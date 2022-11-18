#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { TrustingAccountResourcesStack as TrustingAccountResourcesStack } from '../lib/trusting-account-resources-stack';
import { TrustedAccountResourcesStack as TrustedAccountResourcesStack } from '../lib/trusted-account-resources-stack';
import { Constants } from '../core/constants';
import { Context } from '../core/context';
import { TrustedAccountConfigurationStack } from '../lib/trusted-account-configuration-stack';

const app = new App();
const context = new Context(app.node);

const sourceAccountEnv = {
  account: context.getTrustedAccountId(),
  region: context.getRegion()
};
const targetAccountEnv = {
  account: context.getTrustingAccountId(),
  region: context.getRegion()
};

// # 1
const trustedAccountResourcesStack = new TrustedAccountResourcesStack(app, Constants.Resources.Stacks.TrustedAccountResourcesStack, {
  env: sourceAccountEnv
});

// # 2
const trustingAccountResourcesStack = new TrustingAccountResourcesStack(app, Constants.Resources.Stacks.TrustingAccountResourcesStack, {
  env: targetAccountEnv,
  trustedAccountRole: trustedAccountResourcesStack.role,
  trustedStateMachine: trustedAccountResourcesStack.stateMachine
});
trustingAccountResourcesStack.addDependency(trustedAccountResourcesStack);

const trustedAccountConfigState = new TrustedAccountConfigurationStack(app, Constants.Resources.Stacks.TrustedAccountConfigurationStack, {
  env: sourceAccountEnv,
  trustedAccountRole: trustedAccountResourcesStack.role,
  trustedStateMachine: trustedAccountResourcesStack.stateMachine,
  trustingAccountRole: trustingAccountResourcesStack.role,
  trustingStateMachine: trustingAccountResourcesStack.stateMachine,
  parameter: trustedAccountResourcesStack.param,
  secret: trustingAccountResourcesStack.secret
});

trustedAccountConfigState.addDependency(trustedAccountResourcesStack);
trustedAccountConfigState.addDependency(trustingAccountResourcesStack);