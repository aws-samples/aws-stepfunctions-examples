import { I18n } from 'aws-amplify';

import config from './config';

// Amplify config for Cognito authentication
export default {
  Auth: {
    region: config.Region,
    userPoolId: config.CognitoUserPoolId,
    userPoolWebClientId: config.CognitoUserPoolClientId,
  },
};

// Customise Amplify auth labels
I18n.putVocabulariesForLanguage('en', {
  Username: 'Enter your email address',
  'Enter your Username': 'Enter your email address',
});
