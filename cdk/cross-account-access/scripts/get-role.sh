#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

mkdir -p ../tmp

aws iam get-role \
--role-name $3 \
--profile $1 \
--region $2 \
--output json | jq > ../tmp/$3.json