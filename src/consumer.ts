import { Service, Token } from 'typedi';
import { IConsumerContext } from './abstractions';

@Service()
export abstract class Consumer<TMessage> {
  protected abstract name: string;

  constructor(
    private messageType: { new (...params: any[]): TMessage },
    private isFaultConsumer: boolean = false,
  ) {}

  public getName(): string {
    return this.name;
  }

  public getMessageNamespace(): string {
    return this.messageType.name;
  }

  public faultConsumer() {
    return this.isFaultConsumer;
  }

  abstract consume(message: IConsumerContext<TMessage>): Promise<void>;
}

export abstract class FaultConsumer<TMessage> extends Consumer<TMessage> {
  constructor(messageType: { new (...params: any[]): TMessage }) {
    super(messageType, true);
  }
}

export const CONSUMER_TOKEN = new Token<Consumer<any>>('consumer');

export function ConsumerService() {
  return Service({ id: CONSUMER_TOKEN, multiple: true });
}
