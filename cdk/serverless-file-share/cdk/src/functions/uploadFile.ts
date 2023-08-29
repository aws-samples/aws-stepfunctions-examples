import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { S3_UPLOAD_BUCKET_NAME } from '../lib/constants';
import { logger, wrapHandler } from '../lib/observability';
import { createS3PresignedUrl } from '../lib/s3';
import { generateFileId, httpJsonResponse } from '../lib/util';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Get file path from URL path param
  const filename = event.pathParameters?.filepath;
  const userId = event.requestContext.authorizer?.claims.sub;

  // validate request
  if (!filename) {
    logger.error(`File path parameter is missing`);
    return httpJsonResponse(400, { message: 'File path parameter is missing' });
  }

  // generate file id
  const fileId = generateFileId();

  // generate s3 path to store file
  const key = `${userId}/${fileId}`;

  // Create presigned url for upload
  const uploadUrl = await createS3PresignedUrl({
    bucket: S3_UPLOAD_BUCKET_NAME,
    key,
    metadata: {
      'owner-id': userId,
      filename,
    },
    method: 'PUT',
  });

  // return presigned url + file id to front end
  return httpJsonResponse(200, { uploadUrl, fileId });
};

export const handler = wrapHandler(lambdaHandler);
