import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

// Generate a version 4 UUID
export const generateFileId = () => {
  return uuidv4();
};

// Helper function to return JSON object as HTTP response
export const httpJsonResponse = (statusCode: number, object: object) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
    },
    body: JSON.stringify(object),
  };
};

// Remove undefined/null values from object (before saving to dynamodb)
export const removeNilValues = (obj: object) => {
  return _.omitBy(obj, _.isNil);
};
