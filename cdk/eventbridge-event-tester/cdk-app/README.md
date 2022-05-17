# Welcome to your CDK TypeScript project

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

```zsh

aws ec2 authorize-security-group-ingress \
--cidr 203.0.113.0/24 \
--port 80 \
--protocol tcp \
--profile $AWS_PROFILE \
--region $REGION \
--group-id sg-0a9674ee4937757ab 
```
