import { AmplifyUser } from '@aws-amplify/ui';
import { User } from '@aws-northstar/ui/components/AppLayout/components/NavHeader';

// Convert bytes (int) to formatted string e.g. 3.1 KB
export const formatBytes = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
};

// Convert amplify user object to user object that can be passed to aws-northstar AppLayout
export const formatUserForNav = (user?: AmplifyUser): User | undefined => {
  if (user && user.attributes) {
    return {
      username: user.attributes.name,
      email: user.attributes.email,
    };
  }
};
