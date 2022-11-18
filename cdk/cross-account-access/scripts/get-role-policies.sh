#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

mkdir -p ../tmp

policy_array=$(aws iam list-role-policies \
--role-name $3 \
--output json \
--query "PolicyNames" \
--profile $1 \
--region $2 | jq -c '.[]')
policies=$(echo ${policy_array//\"/""})
for policy in $policies
do
    aws iam get-role-policy --role-name $3 --policy-name $policy --profile $1 --region $2 --output json | jq > ../tmp/$policy.json
done
