import { ResourceStateChangedEvent } from "./impl/resource-state-changed-event";
import { EventConfig } from "./interfaces";

export class EventFactory {
    public readonly config: EventConfig;

    constructor(namespace: string) {
        this.config = {
            eventSource: `com.${namespace}.www`
        };
    }

    resourceStateChangedEvent = (): ResourceStateChangedEvent => {
        return new ResourceStateChangedEvent(this.config);
    }
}