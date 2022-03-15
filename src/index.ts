import 'reflect-metadata';
import { Container } from 'typedi';
import { IBus } from './abstractions';
import {
  TestConsumer2,
  TestingConsumer,
  TestingMessage,
} from './lib/consumers/test-consumer';
import { BusFactory } from './providers';
import { Exponential } from './retry/exponential';

Promise.resolve()
  .then(async () => {
    Container.import([TestingConsumer, TestConsumer2]);

    Container.set('consumer_settings', { url: 'amqp://localhost/%2f' });

    Container.set(IBus, BusFactory.createForRabbitMq());

    const bus = Container.get<IBus>(IBus);

    bus.setRetryPolicy(new Exponential(2, 3));

    await bus.start();

    await bus.send(new TestingMessage('hello'));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
