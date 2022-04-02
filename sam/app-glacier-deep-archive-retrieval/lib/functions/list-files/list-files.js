/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  var response = await s3.listObjectsV2({
    Bucket: process.env.BUCKET_NAME
  }).promise();

  var files = response['Contents'];

  files = await Promise.all(files.map(async file => {
    if (!['GLACIER', 'DEEP_ARCHIVE'].includes(file['StorageClass'])) {
      file['status'] = 'available';
      return file;
    }

    file['status'] = 'archived';

    var response = await s3.headObject({
      Bucket: process.env.BUCKET_NAME,
      Key: file.Key
    }).promise();

    if ('Restore' in response) {
      file['Restore'] = response['Restore'];
      if (file['Restore'].includes('ongoing-request="true"')) {
        file['status'] = 'retrieving';
      } else if (file['Restore'].includes('ongoing-request="false"')) {
        file['status'] = 'available';
      }
    }

    return file;
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(files),
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
};