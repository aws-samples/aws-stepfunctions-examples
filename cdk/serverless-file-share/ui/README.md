# Serverless File Share - User Interface (UI)

This project provides a User Interface (UI) to support the solution described in the AWS blog post: [Enhancing file sharing using Amazon S3 and AWS Step Functions](https://aws.amazon.com/blogs/compute/enhancing-file-sharing-using-amazon-s3-and-aws-step-functions)

This project is a React project bootstrapped with [Create React App (CRA)](https://github.com/facebook/create-react-app).

---

## Getting started

1. Ensure that the [serverless file share CDK](../cdk) project has been deployed to your AWS account.
2. Deploying the CDK project will generate a file in the ```ui/public``` folder called ```config.js```. This file will contain config needed to connect the UI to the backend.

To pull this file to your local environment, run ```npm run config``` from the  ```ui``` folder.

3. Run `npm install` to install NPM packages
4. Run `npm start` to run the UI locally 

---

## Available Scripts

In the project directory, you can run:

#### Local development
```
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### Build for deployment
```
npm run build
```

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include hashes.

See the CRA docs about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
