import { IConsumerContext } from '../../abstractions';
import { Consumer, ConsumerService, FaultConsumer } from '../../consumer';

export class TestingMessage {
  name: 'TestingMessage';

  constructor(public readonly abc: string) {}
}

@ConsumerService()
export class TestingConsumer extends Consumer<TestingMessage> {
  protected name = 'TestingConsumer';

  constructor() {
    super(TestingMessage);
  }

  public async consume(message: IConsumerContext<TestingMessage>) {
    console.log(message);
    throw new Error('Method not implemented.');
  }
}

@ConsumerService()
export class TestConsumer2 extends FaultConsumer<TestingMessage> {
  protected name = 'TestConsumer2';

  constructor() {
    super(TestingMessage);
  }

  public async consume(message: IConsumerContext<TestingMessage>) {
    console.log('FAULT', message);
  }
}
