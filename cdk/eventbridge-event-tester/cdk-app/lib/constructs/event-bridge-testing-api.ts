import { IModel, IRequestValidator, IRestApi, JsonSchemaType, Model, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { IRole, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface IEventBridgeTestingApiProps {
}

export class EventBridgeTestingApi extends Construct {

    public readonly api: IRestApi;
    public readonly model: IModel;
    public readonly requestValidator: IRequestValidator;
    public readonly role: IRole;
    public readonly rootUrl: string;

    constructor(scope: Construct, id: string, props: IEventBridgeTestingApiProps) {
        super(scope, id);

        const api = new RestApi(this, "EventTestApi", {
            deployOptions: {
                stageName: 'prod'
            },
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                ],
                allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                allowCredentials: true,
                allowOrigins: ['*'],
            }
        });

        this.role = new Role(this, 'EventTestApiRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
        });

        this.model = new Model(this, "test-event-model", {
            restApi: api,
            contentType: "application/json",
            description: "To validate the request body",    
            modelName: "TestEventModel",
            schema: {
                type: JsonSchemaType.OBJECT,
                required: ["detail-type", "source", "detail"],
                properties: {
                    "detail-type": { type: JsonSchemaType.STRING },
                    source: { type: JsonSchemaType.STRING },
                    detail: { type: JsonSchemaType.OBJECT },
                },
            },
        });

        this.requestValidator = new RequestValidator(this, "EventTestApiReqValidator", {
            restApi: api,
            validateRequestBody: true
        });

        this.rootUrl = api.url;
        this.api = api;
    }
}