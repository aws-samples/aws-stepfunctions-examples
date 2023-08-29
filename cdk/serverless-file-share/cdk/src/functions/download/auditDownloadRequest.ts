import { recordDownload } from '../../lib/database';
import { wrapHandler } from '../../lib/observability';
import { DownloadEventWithUserAndFileInfo } from '../../types';

const lambdaHandler = async (event: DownloadEventWithUserAndFileInfo): Promise<DownloadEventWithUserAndFileInfo> => {
  const { fileId, userId } = event;
  const dateTimeStamp = new Date().toISOString();

  // Record download request to database
  await recordDownload(fileId, userId, dateTimeStamp);

  return event;
};

export const handler = wrapHandler(lambdaHandler);
