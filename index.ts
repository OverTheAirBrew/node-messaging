import { moduleExists } from './lib/module-exists';
import {
  Contract,
  IAzureMessagingClientOptions,
  IFaultQueueListener,
  IListenerOptions,
  IMessagingClient,
  IMessagingClientOptions,
  IQueueListener,
  IRabbitMessagingClientOptions,
} from './models';

export class MessagingClient {
  private readonly client: IMessagingClient;

  private options: IMessagingClientOptions &
    (IAzureMessagingClientOptions | IRabbitMessagingClientOptions);

  constructor(
    opts: IMessagingClientOptions &
      (IAzureMessagingClientOptions | IRabbitMessagingClientOptions),
  ) {
    this.options = opts;

    let Dialect: any;

    switch (this.getDialect()) {
      case 'azureservicebus':
        moduleExists('@azure/service-bus');
        Dialect = require('./providers/azure-service-bus');
        break;

      case 'rabbit':
        moduleExists('amqplib');
        Dialect = require('./providers/rabbit-mq');
        break;

      default:
        throw new Error(
          `The dialect ${this.getDialect()} is not supported. Supported dialects: rabbitmq and azureservicebus.`,
        );
    }

    this.client = new Dialect(opts);
  }

  public sendMessage<Data>(message: Contract<Data>) {
    return this.client.sendMessage<Data>(message);
  }

  public async listenForFault<Data>(
    contract: Contract<Data>,
    queue: string,
    listener: IFaultQueueListener<Data>,
  ) {
    return await this.client.listenForFault(contract, queue, listener);
  }

  public async listenForMessage<Data>(
    contract: Contract<Data>[],
    queue: string,
    listener: IQueueListener<Data>,
    opts?: IListenerOptions,
  ) {
    return await this.client.listenForMessage(contract, queue, listener, opts);
  }

  private getDialect() {
    return this.options.dialect;
  }
}
