import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as AWSXRay from 'aws-xray-sdk';

import { DOWNLOAD_TABLE, DYNAMO_BATCH_SIZE, FILE_TABLE, REGION } from './constants';
import { formatSharedFilesDbResponse, formatOwnedFilesDbResponse } from './formatters';
import { removeNilValues } from './util';
import { File } from '../types';
import { OwnedFile, SharedFile, Recipient } from '../types';

const dbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient({ region: REGION }));
const dynamoClient = DynamoDBDocumentClient.from(dbClient);

export const getFile = async (fileId: string, recipientEmail?: string): Promise<File | undefined> => {
  const params = {
    TableName: FILE_TABLE,
    KeyConditionExpression: '#fileId = :fileId AND #recipientEmail = :recipientEmail',
    ExpressionAttributeNames: {
      '#fileId': 'fileId',
      '#recipientEmail': 'recipientEmail',
    },
    ExpressionAttributeValues: {
      ':fileId': fileId,
      ':recipientEmail': recipientEmail ? recipientEmail : '-',
    },
  };

  const command = new QueryCommand(params);
  const response = await dynamoClient.send(command);

  if (!response.Items || response.Items.length === 0) {
    return undefined;
  }

  return response.Items[0] as File;
};

export const getFilesByOwner = async (ownerId: string): Promise<OwnedFile[]> => {
  const params = {
    TableName: FILE_TABLE,
    IndexName: 'OwnerIndex',
    KeyConditionExpression: '#ownerId = :ownerId',
    ExpressionAttributeNames: {
      '#ownerId': 'ownerId',
    },
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  const command = new QueryCommand(params);
  const response = await dynamoClient.send(command);

  return formatOwnedFilesDbResponse(response);
};

export const getFilesByRecipient = async (recipientEmail: string): Promise<SharedFile[]> => {
  const params = {
    TableName: FILE_TABLE,
    IndexName: 'RecipientIndex',
    KeyConditionExpression: '#recipientEmail = :recipientEmail',
    ExpressionAttributeNames: {
      '#recipientEmail': 'recipientEmail',
    },
    ExpressionAttributeValues: {
      ':recipientEmail': recipientEmail,
    },
  };

  const command = new QueryCommand(params);
  const response = await dynamoClient.send(command);

  return formatSharedFilesDbResponse(response);
};

export const addFile = async (file: OwnedFile) => {
  const { recipients, ...fileDetails } = file;

  const mainFileRecord = {
    ...fileDetails,
    recipientEmail: '-',
  };

  // Step 1: Check if main file record exists
  const existingRecord = await getFile(file.fileId);

  // Step 2: Insert main file record (if it doesn't exist)
  if (!existingRecord) {
    const params = {
      TableName: FILE_TABLE,
      Item: removeNilValues(mainFileRecord),
    };

    const command = new PutCommand(params);
    await dynamoClient.send(command);
  }

  // Step 3: Insert recipient records
  await addRecipientRecords(fileDetails, recipients);
};

export const addRecipients = async (fileId: string, recipients: Recipient[]) => {
  // Step 1: Get file details
  const file = await getFile(fileId);

  if (!file) {
    throw new Error(`File with fileId: ${fileId} does not exist`);
  }

  // Step 2: Insert recipient records
  await addRecipientRecords(file, recipients);
};

const addRecipientRecords = async (file: File, recipients: Recipient[]) => {
  // Step 1: Prepare recipient records to insert
  const recipientRecords = recipients.map((recipient) => ({
    ...file,
    ...recipient,
  }));

  // Step 2: Batch insert recipient records
  for (let i = 0; i < recipientRecords.length; i += DYNAMO_BATCH_SIZE) {
    const batchRequests = recipientRecords.slice(i, i + DYNAMO_BATCH_SIZE).map((item) => ({
      PutRequest: {
        Item: removeNilValues(item),
      },
    }));

    const batchWriteParams = {
      RequestItems: {
        [FILE_TABLE]: batchRequests,
      },
    };

    const batchWriteCommand = new BatchWriteCommand(batchWriteParams);
    await dynamoClient.send(batchWriteCommand);
  }
};

export const deleteFile = async (fileId: string) => {
  // Step 1: Query to retrieve all records with partiton key = fileId
  const queryParams = {
    TableName: FILE_TABLE,
    KeyConditionExpression: '#fileId = :fileId',
    ExpressionAttributeNames: {
      '#fileId': 'fileId',
    },
    ExpressionAttributeValues: {
      ':fileId': fileId,
    },
  };

  const queryCommand = new QueryCommand(queryParams);
  const queryResponse = await dynamoClient.send(queryCommand);

  if (!queryResponse.Items) {
    return;
  }

  // get list of recipient emails, including recipientEmail = '-' (main file record)
  const recipientEmails = queryResponse.Items.map((item) => item.recipientEmail || '');

  // delete all records
  deleteRecipients(fileId, recipientEmails);
};

export const deleteRecipients = async (fileId: string, recipientEmails: string[]) => {
  // Step 1: Prepare the delete requests for batch deletion
  const deleteRequests = recipientEmails.map((recipientEmail) => ({
    DeleteRequest: {
      Key: {
        fileId,
        recipientEmail,
      },
    },
  }));

  // Step 2: Batch write operation to delete the items
  for (let i = 0; i < deleteRequests.length; i += DYNAMO_BATCH_SIZE) {
    const batchDeleteRequests = deleteRequests.slice(i, i + DYNAMO_BATCH_SIZE);

    const batchWriteParams = {
      RequestItems: {
        [FILE_TABLE]: batchDeleteRequests,
      },
    };

    const batchWriteCommand = new BatchWriteCommand(batchWriteParams);
    await dynamoClient.send(batchWriteCommand);
  }
};

export const recordDownload = async (fileId: string, userId: string, dateTimeStamp: string) => {
  const downloadId = `${userId}#${dateTimeStamp}`;

  const params = {
    TableName: DOWNLOAD_TABLE,
    Item: { fileId, downloadId, userId, dateTimeStamp },
  };

  const command = new PutCommand(params);
  await dynamoClient.send(command);
};

export const getDownloads = async (fileId: string, userId: string): Promise<number> => {
  const params = {
    TableName: DOWNLOAD_TABLE,
    KeyConditionExpression: 'fileId = :fileId and begins_with(downloadId, :userId)',
    ExpressionAttributeValues: {
      ':fileId': fileId,
      ':userId': userId,
    },
  };

  const command = new QueryCommand(params);
  const response = await dynamoClient.send(command);
  return response.Items ? response.Items.length : 0;
};
