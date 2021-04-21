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
import { AbstractBackoff } from '../retry/abstractbackoff';

class RabbitMq implements IMessagingClient {
  private readonly _url: string;
  private readonly _serviceName: string;
  private readonly _backoff: AbstractBackoff;

  private _connection: Connection;
  private _channel: Channel;

  constructor(config: IMessagingClientOptions & IRabbitMessagingClientOptions) {
    this._url = config.url;
    this._serviceName = config.serviceName;
    this._backoff = config.backoff;
  }

  public async listenForMessage<Data>(
    contract: Contract<Data>,
    listener: IQueueListener<Data>,
    options: IListenerOptions,
  ): Promise<void> {
    if (!options || !options.queueName) {
      throw new Error('No queue name specified');
    }

    await this.tryCreateConnection();
    const backoff = options?.backoffLogic || this._backoff || undefined;
    const channel = await this._bindExchangeToQueue(
      contract.Topic,
      options.queueName,
    );
    // track open channels

    await channel.prefetch(1);

    const processMessage = async (message: Message) => {
      if (!message) {
        return;
      }
      //shutdown
      let data = JSON.parse(message.content.toString());
      try {
        await listener(data);
        channel.ack(message);
      } catch (err) {
        if (backoff) {
          if (!backoff.shouldRetry(message.fields.deliveryTag)) {
            await this.send(`dlq.${this._serviceName}.${contract.Topic}`, {
              error: err,
              originalMessage: message,
            });

            return channel.nack(message, false, false);
          }
        }
        //backoff
        channel.nack(message);
      }
    };
    await channel.consume(options.queueName, processMessage, {});
  }

  public async listenForFault<Data>(
    contract: Contract<Data>,
    listener: IFaultQueueListener<Data>,
    options: IListenerOptions,
  ): Promise<void> {
    if (!options || !options.queueName) {
      throw new Error('No queue name specified');
    }

    await this.tryCreateConnection();
    const channel = await this._bindExchangeToQueue(
      `dlq.${this._serviceName}.${contract.Topic}`,
      options.queueName,
    );

    const processMessage = async (message: Message) => {
      try {
        let data = JSON.parse(message.content.toString());
        await listener(data.message, data.error);
      } catch {
      } finally {
        channel.ack(message);
      }
    };

    await channel.consume(options.queueName, processMessage, {});
  }

  public sendMessage<Data>(message: Contract<Data>) {
    return async (request: Data) => {
      await this.send(message.Topic, request);
    };
  }

  private async send<T>(topic: string, data: T, routeKey: string = '*') {
    await this.tryCreateConnection();
    await this._channel.assertExchange(topic, 'topic', {});
    const isSuccess = this._channel.publish(
      topic,
      routeKey,
      Buffer.from(JSON.stringify(data)),
      {
        contentType: 'application/json',
      },
    );

    if (!isSuccess) {
      throw new Error(`Failed to publish to topic ${topic} with data ${data}`);
    }
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
  ): Promise<Channel> {
    await this.tryCreateConnection();

    const channel = await this._connection.createChannel();

    try {
      await channel.assertQueue(queue, null);
      await channel.assertExchange(exchange, 'topic', null);

      // if (!exchange.includes('dlq')) {
      //   await channel.assertExchange(`dlq.${exchange}`, 'topic', null);
      // }

      await channel.bindQueue(queue, exchange, '*', {
        'x-dead-letter-exchange': `dlq.${this._serviceName}.${queue}`,
      });
      await channel.bindQueue(queue, exchange, `${queue}.${exchange}`, {});
      return channel;
    } catch (err) {
      await channel.close();
      throw err;
    }
  }
}

module.exports = RabbitMq;
