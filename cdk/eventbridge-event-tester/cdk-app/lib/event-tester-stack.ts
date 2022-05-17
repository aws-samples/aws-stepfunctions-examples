import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { EventFactory } from './events/event-factory';
import { StateMachineApiResource } from './constructs/state-machine-rest-api-resource';
import { EventBridgeTestingApi } from './constructs/event-bridge-testing-api';
import { ConfigProvider } from './core/config-provider';

export class EventTesterStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const config = ConfigProvider.GetConfig(this.node);

    const eventBus = new EventBus(this, 'EvetTestingBus', {});
    const eventBridgeTestingApi = new EventBridgeTestingApi(this, 'ETA', {});

    const eventFactory = new EventFactory(config.namespace);
    const event = eventFactory.resourceStateChangedEvent();

    // API resource to test a Sample Event
    const testResourceStateChangedEventApiResource = new StateMachineApiResource(this, 'RSCEAR', {
      api: eventBridgeTestingApi.api,
      model: eventBridgeTestingApi.model,
      requestValidator: eventBridgeTestingApi.requestValidator,
      role: eventBridgeTestingApi.role,
      event: event,
      eventBus: eventBus,
      config: config
    });

    // add more endpoints here

    new CfnOutput(this, 'ApiUrl', { value: eventBridgeTestingApi.rootUrl });
    new CfnOutput(this, 'ResourceStateChangedUrl', { 
      value: `${eventBridgeTestingApi.rootUrl}${testResourceStateChangedEventApiResource.resourceName}` 
    });
  }
}
