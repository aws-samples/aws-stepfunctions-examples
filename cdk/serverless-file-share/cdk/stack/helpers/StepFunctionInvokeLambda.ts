import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Fail } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export const StepFunctionInvokeLambda = (scope: Construct, lambdaFunction: IFunction, stepName: string, errorStep?: Fail) => {
  const step = new LambdaInvoke(scope, stepName, {
    lambdaFunction: lambdaFunction,
    outputPath: '$.Payload',
  });

  if (errorStep) {
    step.addCatch(errorStep);
  }

  return step;
};
