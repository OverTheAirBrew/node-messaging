import { AbstractBackoff } from './retry/abstractbackoff';

export interface ClassType<T = any> {
  new (...args: any[]): T;
}

export interface IBus {
  start(): Promise<void>;
  stop(): Promise<void>;
  send<TMessage>(message: TMessage): Promise<void>;
  setRetryPolicy: (policy: AbstractBackoff) => void;
}

export const IBus = class Dummy {} as ClassType<IBus>;

export interface IConsumerContext<TMessage> {
  message: TMessage;
}
