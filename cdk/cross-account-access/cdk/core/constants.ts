export namespace Constants {
    export namespace Resources {
        export class Stacks {
            public static readonly TrustingAccountResourcesStack: string = "trusting-account-resources-stack";
            public static readonly TrustedAccountResourcesStack: string = "trusted-account-resources-stack";
            public static readonly TrustedAccountConfigurationStack: string = "trusted-account-configuration-stack";
        }
        export class Layers {
            public static readonly UtilsLayer: string = "utils";
        }
        export class LambdaPath {
            public static readonly CacheSecretLambda: string = "cache-secret";
        }
    }
}

