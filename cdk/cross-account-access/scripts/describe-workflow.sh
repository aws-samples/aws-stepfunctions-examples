#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

mkdir -p ../tmp

aws stepfunctions describe-state-machine \
--state-machine-arn $3 \
--profile $1 \
--region $2 \
--output json \
--query "definition" | jq -r | jq > ../tmp/$3.json.asl