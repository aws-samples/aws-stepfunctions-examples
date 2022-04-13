/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async function (event, context) {
  const url = s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: event["queryStringParameters"]['fileKey'],
    Expires: 60 * 60
  })

  return {
    statusCode: 302,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Location': url
    }
  }
}