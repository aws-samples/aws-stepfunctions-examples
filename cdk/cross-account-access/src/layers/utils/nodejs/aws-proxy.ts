import { Config, DynamoDB } from "aws-sdk";

export interface IAwsSdkProxy {
    DDB(): DynamoDB;
}

export class AwsSdkProxy implements IAwsSdkProxy {

    private _config: Config;

    private _ddb: DynamoDB;

    constructor(region: string) {
        this._config = new Config({
            region: region
        });
    }

    DDB = (): DynamoDB => {
        if (!this._ddb) {
            this._ddb = new DynamoDB(this._config);
        }
        return this._ddb;
    }
}