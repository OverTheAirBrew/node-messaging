import {
  Contract,
  IFaultQueueListener,
  IListenerOptions,
  IMessagingClient,
  IMessagingClientOptions,
  IQueueListener,
  IRabbitMessagingClientOptions,
} from '../models';

import { Channel, connect, Connection, Message } from 'amqplib';

class RabbitMq implements IMessagingClient {
  private readonly _url: string;
  private readonly _serviceName: string;
  private readonly _backoff: string;

  private _connection: Connection;
  private _channel: Channel;

  constructor(config: IMessagingClientOptions & IRabbitMessagingClientOptions) {
    this._url = config.url;
    this._serviceName = config.serviceName;
    this._backoff = config.url;
  }

  public async listenForMessage<Data>(
    contract: Contract<Data>[],
    queue: string,
    listener: IQueueListener<Data>,
    options: IListenerOptions,
  ): Promise<void> {
    await this.tryCreateConnection();

    await Promise.all(
      contract.map((c) => this._bindExchangeToQueue(c.Topic, queue)),
    );

    const channel = await this._connection.createChannel();
    // track open channels

    await channel.assertQueue(queue, {
      durable: true,
    });

    await channel.prefetch(1);

    async function processMessage(message: Message) {
      if (!message) {
        return;
      }

      //shutdown

      let data = JSON.parse(message.content.toString());

      try {
        await listener(data);
        channel.ack(message);
      } catch (err) {
        //backoff
      }
    }

    await channel.consume(queue, processMessage, {});
  }

  public async listenForFault<Data>(
    contract: Contract<Data>,
    queue: string,
    listener: IFaultQueueListener<Data>,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public sendMessage<Data>(message: Contract<Data>) {
    return async (request: Data) => {
      await this.tryCreateConnection();
      await this._channel.assertExchange(message.Topic, 'topic', {});
      const isSuccess = this._channel.publish(
        message.Topic,
        '*',
        Buffer.from(JSON.stringify(request)),
        {
          contentType: 'application/json',
          headers: undefined,
        },
      );

      if (!isSuccess) {
        throw new Error(
          `Failed to publish to topic ${message.Topic} with data ${request}`,
        );
      }
    };
  }

  private async tryCreateConnection() {
    if (this._connection) {
      return;
    }

    this._connection = await connect(this._url);

    this._channel = await this._connection.createChannel();
  }

  private async _bindExchangeToQueue(
    exchange: string,
    queue: string,
  ): Promise<void> {
    await this.tryCreateConnection();

    const channel = await this._connection.createChannel();

    try {
      await channel.assertQueue(queue, null);
      await channel.assertExchange(exchange, 'topic', null);

      await channel.bindQueue(queue, exchange, `*`, {});
    } catch (err) {
      throw err;
    } finally {
      await channel.close();
    }
  }
}

module.exports = RabbitMq;
