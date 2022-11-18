#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

# navigate tp lambda layers
cd ../src/layers/utils/nodejs

# clean
npm run clean

# navigate to target lambda
cd ../../../../src/lambdas/cache-secret

# clean
npm run clean