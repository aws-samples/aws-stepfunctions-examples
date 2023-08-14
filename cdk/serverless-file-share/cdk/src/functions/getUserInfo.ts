import { getUserInfoByUserId } from '../lib/cognito';
import { wrapHandler } from '../lib/observability';
import { GetUserInfoRequest, GetUserInfoResponse } from '../types';

const lambdaHandler = async (event: GetUserInfoRequest): Promise<GetUserInfoResponse> => {
  const { userId } = event;

  // retrieve user info from cognito
  const user = await getUserInfoByUserId(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // append user object to object and pass to the next step
  return {
    ...event,
    user,
  };
};

export const handler = wrapHandler(lambdaHandler);
