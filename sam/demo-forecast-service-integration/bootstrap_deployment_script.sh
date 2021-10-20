# Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

set -e
if [ -z $1 ] ; then
    echo "Please provide stack name for SAM template"
    exit 1
fi

sam build -t ./template/template.yaml
sam deploy  --stack-name $1  --capabilities CAPABILITY_IAM --no-confirm-changeset
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $1 --query 'Stacks[0].Outputs[?OutputKey==`S3DataBucket`].OutputValue' --output text)
aws s3 cp item-demand-time.csv s3://${BUCKET_NAME}/data/item-demand-time.csv
