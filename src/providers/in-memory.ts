import { promise, queueAsPromised } from 'fastq';
import { InjectMany, Service } from 'typedi';
import { IBus, IConsumerContext } from '../abstractions';
import { Consumer, CONSUMER_TOKEN } from '../consumer';
import { moduleExists } from '../lib/module-exists';
import { AbstractBackoff } from '../retry/abstractbackoff';

@Service()
export default class InMemoryBus implements IBus {
  private queues: Record<string, queueAsPromised[]> = {};
  private retryPolicy: AbstractBackoff;

  constructor(@InjectMany(CONSUMER_TOKEN) private consumers: Consumer<any>[]) {
    moduleExists('fastq');
  }

  public async start(): Promise<void> {
    for (const consumer of this.consumers) {
      const namespace = consumer.getMessageNamespace();
      this.queues[namespace] = [
        ...(this.queues[namespace] || []),
        promise(consumer.consume, 1),
      ];
    }
  }

  public async stop(): Promise<void> {
    this.queues = {};
  }

  public async send<TMessage>(message: TMessage): Promise<void> {
    const name = message.constructor.name;

    const consumerQueues = this.queues[name] || [];

    const context: IConsumerContext<TMessage> = {
      message,
    };

    for (const queue of consumerQueues) {
      await queue.push(context);
    }
  }

  public setRetryPolicy(policy: AbstractBackoff) {
    this.retryPolicy = policy;
  }
}
