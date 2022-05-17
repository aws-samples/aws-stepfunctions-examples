import { BatchWriteItemInput } from "aws-sdk/clients/dynamodb";
import { PutObjectRequest } from "aws-sdk/clients/s3";
import { IAwsSdkProxy } from "./aws-proxy";
import { Helpers } from "./helpers";

export interface IPersistenceConfig {
    ddbTableName: string,
    bucketName: string
}

export interface IEvent {
    eventId: string,
    payload: string,
    expiration: Date,
    error: IEventTransformationError
}

export interface IEventTransformationError {
    errorMessage: string,
    errorCode: string,
    ruleArn: string,
    targetArn: string
}

export class Persistence {
    private _awsSdkProxy: IAwsSdkProxy;
    private _config: IPersistenceConfig;

    constructor(awsSdkProxy: IAwsSdkProxy, config: IPersistenceConfig) {
        this._awsSdkProxy = awsSdkProxy;
        this._config = config;
    }

    public saveAsync = async (event: IEvent) => {
        try {

            const key = `${event.eventId}.json`;

            const data: PutObjectRequest = {
                Bucket: this._config.bucketName,
                Key: key,
                StorageClass: 'STANDARD',
                Body: event.payload,
                Expires: event.expiration
            };

            await this._awsSdkProxy.S3().putObject(data).promise();

            const ttl = Helpers.timestampInSeconds(event.expiration);

            let items: any[] = [];

            let status = (event.error && (event.error.errorCode || event.error.errorMessage)) ? 'ERROR' : 'SUCCESS';

            items.push({
                PutRequest: {
                    Item: {
                        'EventId': { "S": event.eventId },
                        'TimeToLive': { "N": `${ttl}` },
                        'Status': { "S": status },
                        'PayloadBucket': { "S": this._config.bucketName },
                        'PayloadObjectKey': { "S": key },
                        'ErrorMessage': { "S": `${event.error.errorMessage}` },
                        'ErrorCode': { "S": `${event.error.errorCode}` },
                        'RULE_ARN': { "S": `${event.error.ruleArn}` },
                        'TARGET_ARN': { "S": `${event.error.targetArn}` },
                    }
                }
            });

            const params: BatchWriteItemInput = {
                RequestItems: {
                    [this._config.ddbTableName]: items
                }
            };

            await this._awsSdkProxy.DDB().batchWriteItem(params).promise();
        }
        catch (err) {
            console.log('Failed to save an object to S3:', JSON.stringify(err));
            throw err;
        }
    }
}