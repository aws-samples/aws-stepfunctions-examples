import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { getUserInfoByUserId } from '../lib/cognito';
import { getFilesByRecipient } from '../lib/database';
import { wrapHandler } from '../lib/observability';
import { httpJsonResponse } from '../lib/util';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims.sub;
  const user = await getUserInfoByUserId(userId);

  const files = await getFilesByRecipient(user.email);

  return httpJsonResponse(200, files);
};

export const handler = wrapHandler(lambdaHandler);
