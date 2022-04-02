/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require('aws-sdk');
const pricing = new AWS.Pricing({region: 'us-east-1'}); // Pricing API is not available in all regions

exports.handler = async function (event, context) {
  const file_size = parseInt(event['fileSize']) / (1024 * 1024 * 1024);

  const retrieval_pricing = await pricing.getProducts({
    ServiceCode: 'AmazonS3GlacierDeepArchive',
    Filters: [
      { 'Type': 'TERM_MATCH', 'Field': 'regionCode', 'Value': process.env.AWS_REGION },
      { 'Type': 'TERM_MATCH', 'Field': 'feeCode', 'Value': `S3-${event['objectRetrievalTier']}-Retrieval` }
    ]
  }).promise();
  const retrieval_unit_cost = Object.values(Object.values(retrieval_pricing['PriceList'][0]['terms']['OnDemand'])[0]['priceDimensions'])[0]['pricePerUnit']['USD'];

  const data_transfer_pricing = await pricing.getProducts({
    ServiceCode: 'AWSDataTransfer',
    Filters: [
      { 'Type': 'TERM_MATCH', 'Field': 'fromRegionCode', 'Value': process.env.AWS_REGION },
      { 'Type': 'TERM_MATCH', 'Field': 'transferType', 'Value': 'AWS Outbound' }
    ]
  }).promise();
  const data_transfer_unit_cost = Object.values(Object.values(data_transfer_pricing['PriceList'][0]['terms']['OnDemand'])[0]['priceDimensions']).filter(dimension => dimension['beginRange'] == '0')[0]['pricePerUnit']['USD'];
  
  return {
    'retrieval': (file_size * retrieval_unit_cost),
    'dataTransfer': (file_size * data_transfer_unit_cost)
  };
}