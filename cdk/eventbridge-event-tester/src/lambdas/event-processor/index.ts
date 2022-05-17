/* eslint-disable import/extensions, import/no-absolute-path */
import {AwsSdkProxy, Helpers, Persistence} from '/opt/nodejs/utils';

const awsSdkProxy = new AwsSdkProxy(process.env.AWS_REGION!);
const persistence = new Persistence(awsSdkProxy, {
    ddbTableName: process.env.EVENTS_TRACKING_TABLE!,
    bucketName: process.env.EVENTS_BUCKET!
});

exports.handler = async function (event: any) {

    /*
        we are saving processed payload to DDB and to S3
        You can do further testing,
        for example call an API Destination with the processed event payload,
        then process the result and update event status in DDB based on the API Response
    */

    const eventPayload = {
        // we need to know the event id, if the id is not present - we will fail the event
        eventId: event.eventId,
        payload: JSON.stringify(event),
        expiration: Helpers.addDays(Date.now(), 5), // expire the payload after 5 days
        error: {
            ruleArn:"",
            targetArn: "",
            errorMessage: "",
            errorCode: ""
        }
    }

    await persistence.saveAsync(eventPayload);  

    return {
        success: true
    }
}
