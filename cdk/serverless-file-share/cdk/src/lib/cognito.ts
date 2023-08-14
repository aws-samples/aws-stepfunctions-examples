import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import * as AWSXRay from 'aws-xray-sdk';

import { COGNITO_USER_POOL_ID, REGION } from './constants';
import { formatCognitoUserResponse } from './formatters';
import { User } from '../types';

const cognitoClient = AWSXRay.captureAWSv3Client(new CognitoIdentityProviderClient({ region: REGION }));

// fetch user info from cognito using userId
export const getUserInfoByUserId = async (userId: string): Promise<User> => {
  const params = {
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: userId,
  };

  const command = new AdminGetUserCommand(params);

  const response = await cognitoClient.send(command);
  return formatCognitoUserResponse(response);
};
