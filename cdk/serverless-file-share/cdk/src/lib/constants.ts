if (!process.env.REGION) {
  throw new Error('Region environment variable missing');
}

if (!process.env.BUCKET_NAME) {
  throw new Error('S3 bucket environment variable missing');
}

if (!process.env.COGNITO_USER_POOL_ID) {
  throw new Error('Cognito user pool id environment variable missing');
}

if (!process.env.FILE_TABLE) {
  throw new Error('File table environment variable missing');
}

if (!process.env.DOWNLOAD_TABLE) {
  throw new Error('Download table environment variable missing');
}

export const REGION = process.env.REGION;
export const S3_UPLOAD_BUCKET_NAME = process.env.BUCKET_NAME;
export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
export const FILE_TABLE = process.env.FILE_TABLE;
export const DOWNLOAD_TABLE = process.env.DOWNLOAD_TABLE;
export const DYNAMO_BATCH_SIZE = 25;
