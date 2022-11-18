#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

# navigate tp lambda layers
cd ../src/layers/utils/nodejs

# install dependencies
npm install

# build
npm run build

# navigate to target lambda
cd ../../../../src/lambdas/cache-secret

# install dependencies
npm install

# build
npm run build
