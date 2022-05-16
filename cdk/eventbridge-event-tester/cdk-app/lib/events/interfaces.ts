import { EventPattern, RuleTargetInput } from "aws-cdk-lib/aws-events"

export interface EventConfig {
    eventSource: string
}

export interface IEventBridgeEvent {
    transformer(): RuleTargetInput,
    pattern(): EventPattern,
    endpoint(): string
}

export interface ITestableEvent {
    sampleEventPayload(): SampleEventPayload,
}

export interface SampleEventPayload {
    "detail-type": string
    source: string
    detail: any
}

export interface EventTestResponse {
    eventId: string,
    payload: string,
    errorMessage: string,
    errorCode: string,
    status: string
}
