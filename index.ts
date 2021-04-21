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

type InputOptions = IMessagingClientOptions &
  (IAzureMessagingClientOptions | IRabbitMessagingClientOptions);

export class MessagingClient {
  private readonly client: IMessagingClient;

  private options: InputOptions;

  constructor(opts: InputOptions) {
    this.options = opts;

    let Dialect: any;

    const dialect = this.getDialect();

    if (dialect === 'rabbit') {
      moduleExists('amqplib');
      Dialect = require('./providers/rabbit-mq');
    } else if (dialect === 'azureservicebus') {
      moduleExists('@azure/service-bus');
      Dialect = require('./providers/azure-service-bus');
    } else {
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
    listener: IFaultQueueListener<Data>,
    opts?: IListenerOptions,
  ): Promise<void> {
    return await this.client.listenForFault(contract, listener, opts);
  }

  public async listenForMessage<Data>(
    contract: Contract<Data>,
    listener: IQueueListener<Data>,
    opts?: IListenerOptions,
  ) {
    return await this.client.listenForMessage(contract, listener, opts);
  }

  private getDialect() {
    return this.options.dialect;
  }
}
