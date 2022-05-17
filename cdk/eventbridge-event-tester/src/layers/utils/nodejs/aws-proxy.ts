import { Config, DynamoDB, S3 } from "aws-sdk";

export interface IAwsSdkProxy {
    S3(): S3;
    DDB(): DynamoDB;
}

export class AwsSdkProxy implements IAwsSdkProxy {

    private _config: Config;

    private _s3: S3;
    private _ddb: DynamoDB;

    constructor(region: string) {
        this._config = new Config({
            region: region
        });
    }

    S3 = (): S3 => {
        if (!this._s3) {
            this._s3 = new S3(this._config);
        }
        return this._s3;
    }

    DDB = (): DynamoDB => {
        if (!this._ddb) {
            this._ddb = new DynamoDB(this._config);
        }
        return this._ddb;
    }
}