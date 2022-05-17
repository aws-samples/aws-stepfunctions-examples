/* eslint-disable import/extensions, import/no-absolute-path */
import {AwsSdkProxy, Helpers, Persistence} from '/opt/nodejs/utils';

const awsSdkProxy = new AwsSdkProxy(process.env.AWS_REGION!);
const persistence = new Persistence(awsSdkProxy, {
    ddbTableName: process.env.EVENTS_TRACKING_TABLE!,
    bucketName: process.env.EVENTS_BUCKET!
});

exports.handler = async function (event: any) {

    for (let i = 0; i < event.Records.length; i++) {
        await processRecord(event.Records[i]);
    }

    return {
        success: true
    };
}

const processRecord = async (record: any) => {

    const messageAttributes = record.messageAttributes;

    const error = {
        ruleArn: messageAttributes["RULE_ARN"].stringValue,
        targetArn: messageAttributes["TARGET_ARN"].stringValue,
        errorMessage: messageAttributes["ERROR_MESSAGE"].stringValue,
        errorCode: messageAttributes["ERROR_CODE"].stringValue
    };

    // we need to know the event id, if the id is not present - we will fail the event
    // we need to know the event id, if the id is not present - we will fail the event
    const eventId = Helpers.extractEventId(record.body);

    const event = {
        eventId: eventId,
        payload: record.body,
        expiration: Helpers.addDays(Date.now(), 5), // expire the payload after 5 days
        error: error
    }

    await persistence.saveAsync(event);  

    return {
        success: true
    }
}
