
## Prompt chaining with human in the loop
This is a SAMPLE application to demonstrate prompt chaining with human in the loop. prompt chaining is a technique of wiring multiple prompts and prompts responses in a sequence to acheive a business operation. 
The sample application will do the following
1. It creates title and description using Amazon Bedrock foundation model and OpenAI model for a video
2. It sends the generated titles and descriptions to client using IoT Core Websocket
3. When the user chooses one of the titles and descriptions, It generates the avatar and sends the avatar to the user.

### Architecture

![image](./arch.png)

### Getting Started

1. One leg of the workflow uses OpenAI model to create title and description. If you have not done, [create an account and get the api key](https://platform.openai.com/docs/quickstart?context=python)

1. Make sure your account is [enabled to access](https://console.aws.amazon.com/bedrock/home?#/modelaccess) Amazon Bedrock models anthropic-claude-v2 and SDXL 0.8 

1. Create EventBridge connection ARN for the apikey using aws cli. This connection is used as authorization for the openai api when invoking from Step Functions workflow. Replace {openaiKey} in the following command
```bash

aws events create-connection --cli-input-json "{ \"Name\": \"openai\", \"AuthorizationType\": \"API_KEY\", \"AuthParameters\": {\"ApiKeyAuthParameters\": { \"ApiKeyName\": \"Authorization\",  \"ApiKeyValue\": \"Bearer (openaiKey)\" } }} "

```
1. Update the cdk.context.json with connection ARN from the previous step and openai model inference endpoint.

1. Deploy the stack
```bash

cd stack/cdk
cdk deploy --all

```
### Testing locally

1. Update the following variables in [script.js](./test-local-ui/script.js)
    The values can be found in [stack exports](https://console.aws.amazon.com/cloudformation/home)

    REQ_API - value of export name -  genai-api-endpoint
    WSS_AUTHORIZER_NAME - value of export name - genai-iot-authorizer

    WSS_SERVER_URL - Access the [IoT Core console](https://console.aws.amazon.com/iot/home?#/test) and use the **Endpoint** 

2. Copy the video file

    Use the bucket name (genai-video-bucket) from the stack exports.
    ```
        aws s3 cp ../../test-local-ui/bezos-vogels.mp4 s3://{bucketname}

    ```
3. Open the [HTML page](../../test-local-ui/index.html) in browser


### Things to consider
- You must have proper authorization for API Gateway and IoT Core topic. Refer to the following guides for setting up authorization
    1. [Managing access to REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html)
    2. [IoT core custom authorization](https://docs.aws.amazon.com/iot/latest/developerguide/config-custom-auth.html)

- The video used in the sample is a short video. For longer videos, `Read transcript` might throw payload limit error. You must use a Lambda function.
- OpenAI API might throw too many request exception for larger payload.
- Amazon Bedrock integration with Step Functions can be configured to use S3 directly for input as well as output. 

