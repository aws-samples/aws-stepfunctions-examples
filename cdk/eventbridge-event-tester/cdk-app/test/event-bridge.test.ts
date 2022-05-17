import minimist = require('minimist');
import { EventFactory } from '../lib/events/event-factory';
import { ITestableEvent, EventTestResponse } from '../lib/events/interfaces';
import axios from 'axios';

const timeout = 30000; // seconds, API integration timeout

// setting default timeout
jest.setTimeout(timeout);

// getting the arguments
const args = minimist(process.argv.slice(2));

const url = args['url'];
const namespace = args['namespace'];

const eventFactory = new EventFactory(namespace);

const testEventTransformer = async (event: ITestableEvent) => {

    try {

        const response = await axios.post(url, event.sampleEventPayload(), {
            headers: {
                'cache-control': 'no-cache',
                'content-type': 'application/json'
            }
        });

        expect(response.status).toBe(200);

        expect(response.data).toBeDefined();

        const data = response.data as EventTestResponse;

        expect(data).not.toBeNull();

        console.log('API response is:', JSON.stringify(data, null, 4));

        expect(data.status).toBe('SUCCESS');
        expect(data.errorCode).toBe("");
        expect(data.errorMessage).toBe("");

        // you can also inspect data.payload to see the transformed payload
        // console.log(data.payload);

    } catch (e) {
        console.log(e);
        throw e;
    }
}

describe('Test Cloud Watch Event', () => {
    test('TestEvent-CloudWatchAlarmStateChangeEvent-Success', async () => {
        await testEventTransformer(eventFactory.resourceStateChangedEvent());
    });
});