import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as joi from 'joi';

import { deleteRecipients } from '../lib/database';
import { logger, wrapHandler } from '../lib/observability';
import { httpJsonResponse } from '../lib/util';
import { DeleteRecipientsRequest } from '../types';

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // get file id from url path parameter
  const fileId = event.pathParameters?.fileId;

  // Step 1: validate request
  let jsonBody;

  // first check if body is valid JSON
  try {
    jsonBody = JSON.parse(event.body ?? '');
  } catch (err) {
    return httpJsonResponse(400, { message: 'Invalid request' });
  }

  // check if file id paramater is present in URL
  if (!fileId) {
    logger.error('File id parameter is missing');
    return httpJsonResponse(400, { message: 'File id parameter is missing' });
  }

  // check if body has required fields
  const bodySchema = joi.object({
    recipients: joi
      .array()
      .items(
        joi
          .object()
          .keys({
            recipientEmail: joi.string().email().required(),
          })
          .unknown(),
      )
      .min(1)
      .required(),
  });

  const { error } = bodySchema.validate(jsonBody);

  if (error) {
    return httpJsonResponse(400, { message: 'Invalid request' });
  }

  const request = jsonBody as DeleteRecipientsRequest;

  // Step 2: Prepare data to save to database
  const recipientEmails = request.recipients.map((recipient) => recipient.recipientEmail);

  // Step 3: save to database
  await deleteRecipients(fileId, recipientEmails);

  return httpJsonResponse(200, {});
};

export const handler = wrapHandler(lambdaHandler);
