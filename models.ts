import { AbstractBackoff } from './retry/abstractbackoff';

export interface Contract<Data extends Object> {
  Topic: string;
  Data: Data;
}

export interface Fault<Data extends Contract<Data>> {
  contract: Data;
  error: Error;
}

export interface IListenerOptions {
  backoffLogic?: AbstractBackoff;
}

export interface IQueueListener<Data> {
  (message: Data): void | PromiseLike<void>;
}

export interface IFaultQueueListener<Data> {
  (
    message: Data,
    error: { reason: string; description: string; stack: string },
  ): void | PromiseLike<void>;
}

export interface IMessagingClient {
  listenForMessage<Data>(
    contract: Contract<Data>,
    listener: IQueueListener<Data>,
    options: IListenerOptions,
  ): Promise<void>;
  listenForFault<Data>(
    contract: Contract<Data>,
    listener: IFaultQueueListener<Data>,
  ): Promise<void>;
  sendMessage<Data>(
    message: Contract<Data>,
  ): { (request: Data): Promise<void> };
}

export class ServiceBusError<T> extends Error {
  public originalMessage: T;

  constructor(message: T, innerError: Error) {
    super(innerError.message);
    this.originalMessage = message;
  }
}
