interface GlobalVariables {
  config?: ConfigData;
}

// there should be a global window.config object with the structure defined below
type ConfigData = {
  Region: string;
  CognitoUserPoolId: string;
  CognitoUserPoolClientId: string;
  ApiUrl: string;
};

// read config (environment variables) from global 'window' object
const config = (window as GlobalVariables).config as ConfigData;

if (!config) {
  throw new Error(
    'Config file not found. Please deploy CDK project using "npm run deploy" then run "npm run config" to pull the config file from AWS SSM Parameter Store.'
  );
}

export default config;
