/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

exports.handler = async function (event, context) {
  return process.env.API_URL + 'download?' + new URLSearchParams({ fileKey: event['fileKey'] }).toString()
}