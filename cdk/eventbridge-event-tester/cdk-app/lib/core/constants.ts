export namespace Constants {
    export namespace Resources {
        export class Lambdas {
            public static readonly ErrorHandler: string = "error-handler";
            public static readonly EventTester: string = "event-processor";
        }
        export class Layers {
            public static readonly UtilsLayer: string = "utils";
        }
        export class EventGroups {
            public static readonly ProcessedSuccessfully: string = "processed-successfully";
            public static readonly TransformerFailed: string = "transformer-failed";
            public static readonly PatternDoesNotMatch: string = "pattern-does-not-match";
        }
    }
    export namespace Identifiers {
        export class Defaults {
            public static readonly DefaultNamespace: string = "octank";
        }
    }
    export namespace API {
        export class Resources {
            public static readonly ResourceStateChanged: string = "resource-state-changed";
        }
    }
    export namespace Configuration {
        export class Timeots {
            public static readonly ApiGatewayIntegrationTimeout = 29;
            public static readonly EventTesterWorkflowTimeout = 15;
            public static readonly EventStatusCheckWorkflowTimeout = 10;
        }
    }
}
