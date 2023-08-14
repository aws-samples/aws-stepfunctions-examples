import * as joi from 'joi';

import { wrapHandler } from '../../lib/observability';
import { ShareRequest } from '../../types';

const lambdaHandler = async (event: ShareRequest): Promise<ShareRequest> => {
  // check if input has required fields
  const recipientSchema = joi.object({
    recipientEmail: joi.string().email().required(),
    notify: joi.boolean().optional(),
  });

  const inputSchema = joi.object({
    userId: joi.string().required(),
    fileId: joi.string().required(),
    recipients: joi.array().items(recipientSchema).min(1).required(),
    expiryDate: joi.string().isoDate().optional(),
    downloadLimit: joi.number().optional(),
  });

  // validate event
  const { error } = inputSchema.validate(event);

  if (error) {
    console.error(error.details);
    throw new Error('Share request is invalid');
  }

  return event;
};

export const handler = wrapHandler(lambdaHandler);
