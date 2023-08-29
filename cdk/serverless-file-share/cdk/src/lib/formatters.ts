import { AdminGetUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { QueryCommandOutput } from '@aws-sdk/lib-dynamodb';

import { FileMetaData, OwnedFile, SharedFile, User } from '../types';

// Format generic response from DynamoDB
export const formatSharedFilesDbResponse = (response: QueryCommandOutput): SharedFile[] => {
  if (!response.Items) {
    return [];
  }

  // convert dynamodb response to standard json
  return response.Items as SharedFile[];
};

// Format response from DynamoDB when retrieving list of owned files
export const formatOwnedFilesDbResponse = (response: QueryCommandOutput): OwnedFile[] => {
  if (!response.Items) {
    return [];
  }

  const items = response.Items;

  // create array of individual files
  const files = items.filter((x) => x.recipientEmail === '-');

  // add a sub-array of recipients for each file
  files.forEach((file) => {
    // create sub-array
    file.recipients = items
      .filter((x) => x.recipientEmail !== '-' && x.fileId === file.fileId)
      .map((x) => {
        return {
          recipientEmail: x.recipientEmail,
          notify: x.notify,
          expiryDate: x.expiryDate,
          downloadLimit: x.downloadLimit,
        };
      });

    // remove recipientEmail field
    delete file.recipientEmail;
  });

  return files as OwnedFile[];
};

// Convert cognito response into formatted user object
export const formatCognitoUserResponse = (cognitoResponse: AdminGetUserCommandOutput): User => {
  if (!cognitoResponse.UserAttributes) {
    throw new Error('User attributes missing');
  }

  const attributes = Object.fromEntries(cognitoResponse.UserAttributes.map(({ Name, Value }) => [Name, Value]));

  return {
    id: attributes.sub,
    email: attributes.email,
    name: attributes.name,
    email_verified: attributes.email_verified === 'true',
    dateCreated: cognitoResponse.UserCreateDate,
    dateLastModified: cognitoResponse.UserLastModifiedDate,
  };
};

// Convert s3 metadata response into formatted object
export const formatS3MetaDataResponse = (s3Response: HeadObjectCommandOutput): FileMetaData => {
  if (!s3Response.ContentType || !s3Response.ContentLength || !s3Response.Metadata) {
    throw new Error('Invalid S3 meta data');
  }

  return {
    size: s3Response.ContentLength,
    type: s3Response.ContentType,
    ownerId: s3Response.Metadata['owner-id'],
    filename: s3Response.Metadata['filename'],
  };
};
