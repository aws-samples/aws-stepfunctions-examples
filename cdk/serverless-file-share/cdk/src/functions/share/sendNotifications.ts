import { wrapHandler } from '../../lib/observability';
import { ShareRequestWithUserAndFileInfo } from '../../types';

const lambdaHandler = async (event: ShareRequestWithUserAndFileInfo): Promise<ShareRequestWithUserAndFileInfo> => {
  /**
   * This lambda function is intentionally left blank for you to
   * implement your own notification mechanism, e.g. sending an email with Amazon SES
   * or sending a chat notification.
   *
   * Note: the download link is in the format: {API_URL}/download/{fileId}
   */
  return event;
};

export const handler = wrapHandler(lambdaHandler);
