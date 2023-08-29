import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';
import { Hash } from '@aws-sdk/hash-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { parseUrl } from '@aws-sdk/url-parser';
import { formatUrl } from '@aws-sdk/util-format-url';
import * as AWSXRay from 'aws-xray-sdk';

import { REGION } from './constants';
import { formatS3MetaDataResponse } from './formatters';
import { DeleteFileRequest, FileMetaData, GetObjectMetadataRequest, PresignedUrlRequest } from '../types';

const s3 = AWSXRay.captureAWSv3Client(new S3Client({ region: REGION }));

export const createS3PresignedUrl = async ({ bucket, key, metadata, method = 'GET' }: PresignedUrlRequest) => {
  const url = parseUrl(`https://${bucket}.s3.${REGION}.amazonaws.com/${key}`);

  url.query = {};

  // add custom meta data
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      url.query[`x-amz-meta-${key}`] = value;
    }
  }

  const presigner = new S3RequestPresigner({
    credentials: fromEnv(),
    region: REGION,
    sha256: Hash.bind(null, 'sha256'),
  });

  const signedUrlObject = await presigner.presign(new HttpRequest({ ...url, method }));
  return formatUrl(signedUrlObject);
};

export const getObjectMetaData = async ({ bucket, key }: GetObjectMetadataRequest): Promise<FileMetaData> => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const command = new HeadObjectCommand(params);
  const response = await s3.send(command);
  return formatS3MetaDataResponse(response);
};

export const deleteFileFromS3 = async ({ bucket, key }: DeleteFileRequest) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };

  const command = new DeleteObjectCommand(params);
  await s3.send(command);
};
