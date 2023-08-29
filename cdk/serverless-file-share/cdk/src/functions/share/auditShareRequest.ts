import { wrapHandler } from '../../lib/observability';
import { ShareRequestWithUserAndFileInfo } from '../../types';

const lambdaHandler = async (event: ShareRequestWithUserAndFileInfo): Promise<ShareRequestWithUserAndFileInfo> => {
  /**
   * This lambda function is intentionally left blank for you to
   * implement your own audit requirements, e.g. recording share requests to a database.
   */
  return event;
};

export const handler = wrapHandler(lambdaHandler);
