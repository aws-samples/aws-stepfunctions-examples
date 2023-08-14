import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getFilesByOwner } from '../lib/database';
import { wrapHandler } from '../lib/observability';
import { httpJsonResponse } from '../lib/util';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims.sub;
  const files = await getFilesByOwner(userId);

  return httpJsonResponse(200, files);
};

export const handler = wrapHandler(lambdaHandler);
