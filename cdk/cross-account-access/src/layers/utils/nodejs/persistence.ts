import { BatchWriteItemInput, BatchWriteItemOutput } from "aws-sdk/clients/dynamodb";
import { IAwsSdkProxy } from "./aws-proxy";
import { Helpers } from "./helpers";

export interface IPersistenceConfig {
    ddbTableName: string
}

export interface ISecret {
    secretArn: string,
    secretValue: string,
    expiration: Date
}

export class Persistence {
    private _awsSdkProxy: IAwsSdkProxy;
    private _config: IPersistenceConfig;

    constructor(awsSdkProxy: IAwsSdkProxy, config: IPersistenceConfig) {
        this._awsSdkProxy = awsSdkProxy;
        this._config = config;
    }

    public saveAsync = async (secret: ISecret): Promise<BatchWriteItemOutput> => {
        try {

            let items: any[] = [];

            // setting up time to live
            const ttl = Helpers.timestampInSeconds(secret.expiration);

            items.push({
                PutRequest: {
                    Item: {
                        'SecretArn': { "S": secret.secretArn },
                        'TimeToLive': { "N": `${ttl}` },
                        'SecretValue': { "S": secret.secretValue }
                    }
                }
            });

            const params: BatchWriteItemInput = {
                RequestItems: {
                    [this._config.ddbTableName]: items
                }
            };

            const result = await this._awsSdkProxy.DDB().batchWriteItem(params).promise();

            return result;
        }
        catch (err) {
            console.log('Failed to save an object to DDB:', JSON.stringify(err));
            throw err;
        }
    }
}