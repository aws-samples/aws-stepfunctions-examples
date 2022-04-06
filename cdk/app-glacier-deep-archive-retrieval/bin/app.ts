#!/usr/bin/env node

/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GlacierRetrievalAppStack } from '../lib/stack';
import { GlacierRetrievalAthenaStack } from '../lib/athena-stack';

const app = new cdk.App();
new GlacierRetrievalAppStack(app, 'GlacierRetrievalApp');
new GlacierRetrievalAthenaStack(app, 'GlacierRetrievalAthenaStack');