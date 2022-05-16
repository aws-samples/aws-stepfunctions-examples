import { Duration, IResource } from "aws-cdk-lib";
import { IModel, IRequestValidator, IRestApi, MethodOptions, Model, PassthroughBehavior, StepFunctionsIntegration } from "aws-cdk-lib/aws-apigateway";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { IConfig } from "../core/config-provider";
import { IEventBridgeEvent } from "../events/interfaces";
import { EventTracker } from "./event-tracker";

interface IStateMachineApiResourceProps {
    api: IRestApi,
    model: IModel,
    requestValidator: IRequestValidator,
    role: IRole,
    event: IEventBridgeEvent,
    eventBus: IEventBus,
    config: IConfig
}

export class StateMachineApiResource extends Construct {

    public readonly resource: IResource;
    public readonly resourceName: string;

    constructor(scope: Construct, id: string, props: IStateMachineApiResourceProps) {
        super(scope, id);

        const eventTracker = new EventTracker(this, 'ET', {
            event: props.event,
            eventBus: props.eventBus,
            config: props.config
        });

        this.resourceName = props.event.endpoint();

        const resource = props.api.root.addResource(this.resourceName);

        const integrationResponse = [{
            selectionPattern: '200',
            statusCode: '200',
            // We are only interested in the `output` section. 
            responseTemplates: {
                'application/json': "$util.parseJson($input.json('$.output'))"
            }
        }];

        const methodProps: MethodOptions = {
            methodResponses: [{
                statusCode: '200',
                responseModels: {
                    'application/json': Model.EMPTY_MODEL
                }
            }],
            requestValidator: props.requestValidator,
            requestModels: {
                'application/json': props.model
            }
        };

        resource.addMethod('POST', StepFunctionsIntegration.startExecution(eventTracker.workflow.stateMachine, {
            headers: false,
            timeout: Duration.seconds(29), // max available
            credentialsRole: props.role,
            integrationResponses: integrationResponse,
            passthroughBehavior: PassthroughBehavior.NEVER,
        }), methodProps);

        // we need to allow our Rest API to start the workflow
        eventTracker.workflow.stateMachine.grantStartSyncExecution(props.role);

        this.resource = resource;
    }
}
