import {
  ServiceBusClient,
  ServiceBusSender,
  ServiceBusReceiver,
  ServiceBusAdministrationClient,
  RetryMode,
} from '@azure/service-bus';

import {
  Contract,
  IFaultQueueListener,
  IListenerOptions,
  IMessagingClient,
  IQueueListener,
  ServiceBusError,
} from './models';

import { AbstractBackoff } from './retry/abstractbackoff';
import { snooze } from './utils';

interface IAzureServiceBusConfig {
  connectionString: string;
  serviceName: string;
  backoffLogic?: AbstractBackoff;
}

export class AzureServiceBus implements IMessagingClient {
  private readonly _connectionString: string;
  private readonly _serviceName: string;
  private readonly _backoff: AbstractBackoff;

  private _client: ServiceBusClient;
  private _admin: ServiceBusAdministrationClient;

  private openSubscriptions: ServiceBusReceiver[] = [];

  constructor(config: IAzureServiceBusConfig) {
    this._connectionString = config.connectionString;
    this._serviceName = config.serviceName;
    this._backoff = config.backoffLogic;

    // process.once('SIGTERM', async () => {
    //   await this.closeAllSubscriptions();
    // });
    // process.once('SIGINT', async () => {
    //   await this.closeAllSubscriptions();
    // });
  }

  public sendMessage<Data>(message: Contract<Data>) {
    return async (request: Data) => {
      const _sender = await this.setupPublisher(message.Topic);

      const serviceBusMessage = {
        body: request,
      };

      await _sender.sendMessages(serviceBusMessage);
      await _sender.close();
    };
  }

  public async listenForFault<Data>(
    contract: Contract<Data>,
    listener: IFaultQueueListener<Data>,
  ) {
    const _listener = await this.setupSubscribe(`${contract.Topic}`, true);
    this.openSubscriptions.push(_listener);

    _listener.subscribe({
      processError: async (error) => {},
      processMessage: async (message) => {
        const {
          deadLetterErrorDescription,
          deadLetterReason,
          applicationProperties: { deadLetterErrorStack },
        } = message as any;

        try {
          await listener(message.body, {
            reason: deadLetterReason,
            description: deadLetterErrorDescription,
            stack: deadLetterErrorStack,
          });
          await _listener.completeMessage(message);
        } catch (err) {
          console.log(err);
          await _listener.completeMessage(message);
        }
      },
    });
  }

  public async listenForMessage<Data>(
    contract: Contract<Data>,
    listener: IQueueListener<Data>,
    opts?: IListenerOptions,
  ) {
    const _listener = await this.setupSubscribe(contract.Topic);
    this.openSubscriptions.push(_listener);

    const backoff = opts.backoffLogic || this._backoff || undefined;

    _listener.subscribe({
      processMessage: async (message) => {
        try {
          await listener(message.body);
          await _listener.completeMessage(message);
        } catch (err) {
          if (backoff) {
            if (!backoff.shouldRetry(message.deliveryCount)) {
              return await _listener.deadLetterMessage(message, {
                deadLetterReason: err.name,
                deadLetterErrorDescription: err.message,
                deadLetterErrorStack: err.stack,
              });
            }

            const waitTime = backoff.getWaitTime(message.deliveryCount);
            await snooze(waitTime);
          }

          throw err;
        }
      },
      processError: async () => {},
    });
  }

  // private async closeAllSubscriptions() {
  //   await Promise.all(this.openSubscriptions.map((sub) => sub.close()));
  // }

  private async tryCreateClient() {
    if (this._client) {
      return;
    }

    this._client = new ServiceBusClient(this._connectionString, {
      retryOptions: {
        maxRetries: 3,
        mode: RetryMode.Exponential,
      },
    });
  }

  private async setupSubscribe(topic: string, deadLetter: boolean = false) {
    await this.tryCreateClient();

    await this.createTopicIfNotExist(topic);
    await this.createSubscriptionIfNotExist(topic);
    return this._client.createReceiver(topic, this._serviceName, {
      subQueueType: deadLetter ? 'deadLetter' : undefined,
    });
  }

  private async setupPublisher(topic: string) {
    this.tryCreateClient();

    await this.createTopicIfNotExist(topic);
    return this._client.createSender(topic);
  }

  private async createAdminClientIfNotExist() {
    if (this._admin) {
      return;
    }

    this._admin = new ServiceBusAdministrationClient(this._connectionString);
  }

  private async createSubscriptionIfNotExist(topic: string) {
    await this.createAdminClientIfNotExist();

    if (await this._admin.subscriptionExists(topic, this._serviceName)) {
      return;
    }

    await this._admin.createSubscription(topic, this._serviceName, {});
  }

  private async createTopicIfNotExist(topic: string) {
    await this.createAdminClientIfNotExist();

    if (await this._admin.topicExists(topic)) {
      return;
    }

    await this._admin.createTopic(topic);
  }
}
