import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

interface StepFunctionApiInput {
  name: string;
  sourceType: 'body' | 'params';
}

export const StepFunctionApiIntegration = (
  stateMachine: sfn.StateMachine,
  apiInputs?: StepFunctionApiInput[],
): apigateway.AwsIntegration => {
  // construct VTL request template
  let requestTemplate = '';
  requestTemplate += `#set($jsonStr = '"{')\n`;

  // pass userId as input to step function from cognito authorizer
  requestTemplate += `#set($jsonStr = $jsonStr + '\\"userId\\": \\"' + $context.authorizer.claims.sub + '\\"')\n`;

  if (apiInputs) {
    // pass paramaters from URL path and/or query string as strings
    const params = apiInputs.filter((i) => i.sourceType === 'params');
    params.forEach((p) => {
      requestTemplate += `#if($input.params('${p.name}') != '')\n`;
      requestTemplate += `#set($jsonStr = $jsonStr + ',\\"${p.name}\\": \\"' + $util.escapeJavaScript($input.params('${p.name}')) + '\\"')\n`;
      requestTemplate += `#end\n`;
    });

    // pass parameters from http POST body JSON object
    const body = apiInputs.filter((i) => i.sourceType === 'body');
    body.forEach((p) => {
      requestTemplate += `#if($input.path('$.${p.name}') != '')\n`;
      requestTemplate += `#set($jsonStr = $jsonStr + ',\\"${p.name}\\": ' + $util.escapeJavaScript($input.json('$.${p.name}')))\n`;
      requestTemplate += `#end\n`;
    });
  }

  requestTemplate += `#set($jsonStr = $jsonStr + '}"')\n`;

  // construct step function "StartSyncExecution" payload
  requestTemplate += `{\n`;
  requestTemplate += `  "name": "$context.requestId",\n`;
  requestTemplate += `  "input": $jsonStr,\n`;
  requestTemplate += `  "stateMachineArn": "${stateMachine.stateMachineArn}"\n`;
  requestTemplate += `}`;

  // return integration object
  return apigateway.StepFunctionsIntegration.startExecution(stateMachine, {
    passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    requestTemplates: {
      'application/json': requestTemplate,
    },

    // Map response from step function to API gateway response including CORS headers
    integrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'application/json': `
            #set($context.responseOverride.header.Access-Control-Allow-Headers = '*')
            #set($context.responseOverride.header.Access-Control-Allow-Origin = '*')
            #set($context.responseOverride.header.Access-Control-Allow-Methods = '*')
            #if($input.path('$.status').toString().equals("FAILED"))
              #set($context.responseOverride.status = 500)
              {
                "error": "$input.path('$.error')",
                "cause": "$input.path('$.cause')"
              }
            #else
              $input.path('$.output')
            #end
            `,
        },
      },
    ],
  });
};

export default StepFunctionApiIntegration;
