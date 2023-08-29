import { S3_UPLOAD_BUCKET_NAME } from '../../lib/constants';
import { wrapHandler } from '../../lib/observability';
import { createS3PresignedUrl } from '../../lib/s3';
import { DownloadEventWithUserAndFileInfo, DownloadResponse, PresignedUrlRequest } from '../../types';

const lambdaHandler = async (event: DownloadEventWithUserAndFileInfo): Promise<DownloadResponse> => {
  const { file, user } = event;

  // s3 key is ownerId + '/' + fileId
  const key = `${file.ownerId}/${file.fileId}`;

  const presignedUrlRequest: PresignedUrlRequest = {
    bucket: S3_UPLOAD_BUCKET_NAME,
    key,
  };

  // add recipient details to presigned url for reporting
  presignedUrlRequest.metadata = {
    'recipient-id': user.id,
    'recipient-email': user.email,
    filename: file.filename,
  };

  // generate presigned url
  const downloadUrl = await createS3PresignedUrl(presignedUrlRequest);

  // return url
  return { downloadUrl };
};

export const handler = wrapHandler(lambdaHandler);
