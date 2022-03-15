import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import { Inject, InjectMany, Service } from 'typedi';
import { IBus, IConsumerContext } from '../abstractions';
import { Consumer, CONSUMER_TOKEN } from '../consumer';
import { moduleExists } from '../lib/module-exists';
import { AbstractBackoff } from '../retry/abstractbackoff';
import { snooze } from '../utils';

@Service()
export default class RabbitMq implements IBus {
  private connection: Connection;
  private channel: Channel;
  private retryPolicy: AbstractBackoff;

  private openChannels: Channel[] = [];

  constructor(
    @InjectMany(CONSUMER_TOKEN) private consumers: Consumer<any>[],
    @Inject('consumer_settings') private settings: { url: string },
  ) {
    moduleExists('amqplib');
  }

  public async start(): Promise<void> {
    this.connection = await connect(this.settings.url);
    this.channel = await this.connection.createChannel();

    for (const consumer of this.consumers) {
      await this.listenForMessage(consumer, consumer.faultConsumer());
    }
  }

  private async listenForMessage<TMessage>(
    consumer: Consumer<TMessage>,
    isFault: boolean,
  ) {
    const queue = isFault
      ? `dlq.${consumer.getName()}.${consumer.getMessageNamespace()}`
      : `${consumer.getName()}.${consumer.getMessageNamespace()}`;

    const channelName = isFault
      ? `dlq.${consumer.getMessageNamespace()}`
      : consumer.getMessageNamespace();

    const channel = await this.bindToExchange(channelName, queue, isFault);

    await channel.prefetch(10);

    const processMessage = async (message: ConsumeMessage) => {
      if (!message) return;

      const messageContent = JSON.parse(message.content.toString());

      try {
        await consumer.consume(messageContent);
        channel.ack(message);
      } catch (err) {
        if (this.retryPolicy && !isFault) {
          const retryNumber = message.fields.deliveryTag - 1;

          if (!this.retryPolicy.shouldRetry(retryNumber)) {
            await this.sendMessage(`dlq.${consumer.getMessageNamespace()}`, {
              error: err,
              originalMessage: message,
            });

            return channel.nack(message, false, false);
          } else {
            const delay = this.retryPolicy.getWaitTime(retryNumber);
            await snooze(delay);
            return channel.nack(message, true, true);
          }
        }

        channel.nack(message, false, false);
      }
    };

    await channel.consume(queue, processMessage, {});
  }

  private async bindToExchange(
    exchange: string,
    queue: string,
    isFault: boolean,
  ) {
    const channel = await this.connection.createChannel();

    try {
      await channel.assertQueue(queue, null);
      await channel.assertExchange(exchange, 'topic', null);

      await channel.bindQueue(queue, exchange, '*', {});

      if (!isFault) {
        await channel.bindQueue(queue, exchange, `${queue}.${exchange}`, {});
      }

      return channel;
    } catch (err) {
      await channel.close();
      throw err;
    }
  }

  stop(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async send<TMessage>(message: TMessage): Promise<void> {
    const name = message.constructor.name;
    await this.sendMessage(name, message);
  }

  private async sendMessage<TMessage>(exchange: string, message: TMessage) {
    const context: IConsumerContext<TMessage> = {
      message,
    };

    await this.channel.assertExchange(exchange, 'topic', {});

    const isSuccess = this.channel.publish(
      exchange,
      '*',
      Buffer.from(JSON.stringify(context)),
      {
        contentType: 'application/json',
      },
    );

    if (!isSuccess) {
      throw new Error(
        `Failed to publish to topic ${name} with data ${message}`,
      );
    }
  }

  public setRetryPolicy(policy: AbstractBackoff) {
    this.retryPolicy = policy;
  }
}
