import {
  ServiceBusClient,
  ServiceBusAdministrationClient,
  RetryMode,
} from '@azure/service-bus';

import {
  Contract,
  IAzureMessagingClientOptions,
  IFaultQueueListener,
  IListenerOptions,
  IMessagingClient,
  IMessagingClientOptions,
  IQueueListener,
} from '../models';

import { AbstractBackoff } from '../retry/abstractbackoff';
import { snooze } from '../utils';

class AzureServiceBus implements IMessagingClient {
  private readonly _connectionString: string;
  private readonly _serviceName: string;
  private readonly _backoff: AbstractBackoff;

  private _client: ServiceBusClient;
  private _admin: ServiceBusAdministrationClient;

  constructor(config: IMessagingClientOptions & IAzureMessagingClientOptions) {
    this._connectionString = config.connectionString;
    this._serviceName = config.serviceName;
    this._backoff = config.backoff;
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
    options: IListenerOptions,
  ) {
    const _listener = await this.setupSubscribe(`${contract.Topic}`, true);

    _listener.subscribe({
      processError: async () => {},
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
    const backoff = opts?.backoffLogic || this._backoff || undefined;

    const _listener = await this.setupSubscribe(contract.Topic);

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

module.exports = AzureServiceBus;
