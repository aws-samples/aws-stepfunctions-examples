import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { ServerlessFileShareStack } from '../stack';

test('Lambda function created', () => {
  const app = new cdk.App();
  const stack = new ServerlessFileShareStack(app, 'MyTestStack');

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: 'index.handler',
  });
});
