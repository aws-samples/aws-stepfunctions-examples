import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Metrics, logMetrics } from '@aws-lambda-powertools/metrics';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { Handler } from 'aws-lambda';

export const logger = new Logger({
  persistentLogAttributes: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || 'N/A',
    aws_region: process.env.AWS_REGION || 'N/A',
  },
});

export const metrics = new Metrics({
  defaultDimensions: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || 'N/A',
    aws_region: process.env.AWS_REGION || 'N/A',
  },
});

export const tracer = new Tracer();

// This function wraps a lambda handler with observability middleware
export const wrapHandler = <TEvent = unknown, TResult = unknown>(lambdaHandler: Handler<TEvent, TResult>) => {
  // capture X-ray traces, Cloudwatch logs and metrics
  return middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(injectLambdaContext(logger, { clearState: true }));
};
