import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { S3_UPLOAD_BUCKET_NAME } from '../lib/constants';
import { deleteFile, getFile } from '../lib/database';
import { logger, wrapHandler } from '../lib/observability';
import { deleteFileFromS3 } from '../lib/s3';
import { httpJsonResponse } from '../lib/util';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const userId = event.requestContext.authorizer?.claims.sub;

  // get file id from url path parameter
  const fileId = event.pathParameters?.fileId;

  // validate request
  if (!fileId) {
    logger.error(`File id parameter is missing`);
    return httpJsonResponse(400, { message: 'File id parameter is missing' });
  }

  // Step 1: retrieve file info from database
  const file = await getFile(fileId);

  // Step 2: validate user is owner of file
  if (!file || file.ownerId !== userId) {
    throw new Error('User is not authorized to delete file or file does not exist');
  }

  // Step 3: delete file from database
  await deleteFile(fileId);

  // Step 4: remove file from s3
  await deleteFileFromS3({ bucket: S3_UPLOAD_BUCKET_NAME, key: `${userId}/${fileId}` });

  // return success response
  return httpJsonResponse(200, {});
};

export const handler = wrapHandler(lambdaHandler);
