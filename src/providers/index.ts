import Container from 'typedi';
import { IBus } from '../abstractions';

export namespace BusFactory {
  export function createForInMemory(): IBus {
    const bus = Container.get<IBus>(require('./in-memory').default);
    return bus;
  }

  export function createForRabbitMq(): IBus {
    const bus = Container.get<IBus>(require('./rabbit-mq').default);
    return bus;
  }
}
