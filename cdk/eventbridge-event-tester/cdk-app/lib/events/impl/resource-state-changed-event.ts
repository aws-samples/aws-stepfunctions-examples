import { EventField, EventPattern, RuleTargetInput } from "aws-cdk-lib/aws-events";
import { Constants } from "../../core/constants";
import { EventConfig, SampleEventPayload, IEventBridgeEvent, ITestableEvent } from "../interfaces"

export class ResourceStateChangedEvent implements IEventBridgeEvent, ITestableEvent {

    private readonly detailType: string = 'Resource State Changed Event';

    private readonly _config: EventConfig;

    constructor(config: EventConfig) {
        this._config = config;
    }

    transformer(): RuleTargetInput {
        return RuleTargetInput.fromObject({
            // event id is required
            eventId: EventField.eventId,
            region: EventField.region,
            source: EventField.source,
            account: EventField.account,
            time: EventField.time,
            detailType: EventField.detailType,
            transformed: true,
            ruleArn: '<aws.events.rule-arn>',
            ruleName: '<aws.events.rule-name>',
            ingestTime: '<aws.events.event.ingestion-time>',
            detail: {
                resourceName: EventField.fromPath("$.detail.resourceName"),
                previousState: EventField.fromPath("$.detail.previousState"),
                currentState: EventField.fromPath("$.detail.state"),
                // uncomment this to break the test
                // custom: '<aws.events.event.json>' // this will break the transformer
            }
        });
    }

    pattern(): EventPattern {
        return {
            // we are interested in a particular data source
            source: [this._config.eventSource],
            // also we want to make sure that `detail` field has certain props present
            detail: {
                resourceName: [{ "exists": true }],
                // --------------------------
                // this does not work
                // state: [{"exists": true}]
                // --------------------------
                // only works on leaf noads, e.g. values:
                state: {
                    reason: [{ "exists": true }],
                    value: ["ALARM"]
                },
                previousState: {
                    value: ["OK"]
                }
            }
        }
    }

    endpoint(): string {
        return Constants.API.Resources.ResourceStateChanged;
    }

    sampleEventPayload(): SampleEventPayload {
        return {
            "detail-type": this.detailType,
            source: this._config.eventSource,
            detail: {
                "resourceName": "CustomResource",
                "previousState": {
                    "value": "OK"
                },
                "state": {
                    "reason": "Resource has entered ALARM state.",
                    "value": "ALARM"
                }
            }
        }
    }
}