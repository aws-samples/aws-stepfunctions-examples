#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

# navigate to the cdk-app
cd cdk-app

# clean all
npm run clean