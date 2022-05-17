#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path"

# navigate tp lambda layers
cd src/layers/utils/nodejs

# clean
npm run clean

# navigate to error-handler lambda
cd ../../../../src/lambdas/error-handler

# clean
npm run clean

# navigate to event-tester lambda
cd ../event-processor

# clean all
npm run clean