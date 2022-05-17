import { Node } from "constructs";
import { AppContext } from "./app-context";

export interface IConfig {
    namespace: string,
    eventTesterWorkflowTimeout: number,
    eventStatusPollerWorkflowTimeout: number
}

export class ConfigProvider {
    static GetConfig = (node: Node): IConfig => {

        const namespace = AppContext.GetNamespace(node);
        const eventTesterWorkflowTimeout = AppContext.GetEventTestingWorkflowExecutionTimeout(node);
        const eventStatusPollerWorkflowTimeout = AppContext.GeteventStatusPollerWorkflowTimeout(node);

        if (eventStatusPollerWorkflowTimeout >= eventTesterWorkflowTimeout) {
            throw `EventTesterWorkflowTimeout "${eventTesterWorkflowTimeout}" has to be greater than EventStatusPollerWorkflowTimeout "${eventStatusPollerWorkflowTimeout}"`
        }

        return {
            eventStatusPollerWorkflowTimeout: eventStatusPollerWorkflowTimeout,
            eventTesterWorkflowTimeout: eventTesterWorkflowTimeout,
            namespace: namespace
        };
    }
} 