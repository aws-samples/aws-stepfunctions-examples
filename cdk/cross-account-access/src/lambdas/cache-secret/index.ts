/* eslint-disable import/extensions, import/no-absolute-path */
import {AwsSdkProxy, Helpers, Persistence} from '/opt/nodejs/utils';

const awsSdkProxy = new AwsSdkProxy(process.env.AWS_REGION!);
const persistence = new Persistence(awsSdkProxy, {
    ddbTableName: process.env.SECRET_CACHE_TABLE!
});

export const handler: any = async (event: any) => {

    // perform transformations. For example, we are adding ttl
    const secret = {
        secretArn: event.secretArn,
        secretValue: event.secretValue.Item.SecretValue.S,
        expiration: Helpers.addDays(Date.now(), 1), // expire the payload after 1 day
    }

    await persistence.saveAsync(secret);

    return secret;
};