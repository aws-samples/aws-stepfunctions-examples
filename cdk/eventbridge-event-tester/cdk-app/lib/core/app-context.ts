import { Node } from "constructs";
import { Constants } from "./constants";

export class AppContext {
    static GetNamespace = (node: Node): string => {
        return node.tryGetContext('namespace') || Constants.Identifiers.Defaults.DefaultNamespace;
    }

    static GetEventTestingWorkflowExecutionTimeout = (node: Node): number => {
        const value = node.tryGetContext('eventTesterWorkflowTimeout');
        if (!value) {
            return Constants.Configuration.Timeots.EventTesterWorkflowTimeout;
        }
        try {
            const timeout = Number(value);
            if (timeout > Constants.Configuration.Timeots.ApiGatewayIntegrationTimeout) {
                return Constants.Configuration.Timeots.EventTesterWorkflowTimeout;
            }
            return timeout;
        }
        catch (err) {
            return Constants.Configuration.Timeots.EventTesterWorkflowTimeout;
        }
    }

    static GeteventStatusPollerWorkflowTimeout = (node: Node): number => {
        const value = node.tryGetContext('eventStatusPollerWorkflowTimeout');
        if (!value) {
            return Constants.Configuration.Timeots.EventStatusCheckWorkflowTimeout;
        }
        try {
            const timeout = Number(value);
            const eventTesterWorkflowTimeout = AppContext.GetEventTestingWorkflowExecutionTimeout(node);
            if (timeout > eventTesterWorkflowTimeout) {
                return eventTesterWorkflowTimeout;
            }
            return timeout;
        }
        catch (err) {
            return Constants.Configuration.Timeots.EventTesterWorkflowTimeout;
        }
    }
}