import { S3_UPLOAD_BUCKET_NAME } from '../../lib/constants';
import { wrapHandler } from '../../lib/observability';
import { getObjectMetaData } from '../../lib/s3';
import { ShareRequestWithUserAndFileInfo, ShareRequestWithUserInfo } from '../../types';

const lambdaHandler = async (event: ShareRequestWithUserInfo): Promise<ShareRequestWithUserAndFileInfo> => {
  const { userId, fileId } = event;

  // get file meta data from S3
  const file = await getObjectMetaData({
    bucket: S3_UPLOAD_BUCKET_NAME,
    key: `${userId}/${fileId}`,
  });

  // validate that user is owner of this file
  if (file.ownerId !== userId) {
    throw new Error('User is not authorized to share this file');
  }

  // add file info to object and pass to next step
  return {
    ...event,
    file,
  };
};

export const handler = wrapHandler(lambdaHandler);
