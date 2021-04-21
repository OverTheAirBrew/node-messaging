import { AbstractBackoff } from './retry/abstractbackoff';

export interface Contract<Data extends Object> {
  Topic: string;
  Data: Data;
}

export interface Fault<Data extends Contract<Data>> {
  contract: Data;
  error: Error;
}

/**
 * @param {AbstractBackoff} backoffLogic - defines the backoff logic for the specific listener. Overrides the one set at a global level
 * @param {string} queueName - the name of the queue to use (only for rabbitmq)
 */
export interface IListenerOptions {
  backoffLogic?: AbstractBackoff;
  queueName?: string;
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
    options: IListenerOptions,
  ): Promise<void>;
  sendMessage<Data>(
    message: Contract<Data>,
  ): { (request: Data): Promise<void> };
}

export interface IMessagingClientOptions {
  serviceName: string;
  backoff?: AbstractBackoff;
}

export interface IAzureMessagingClientOptions {
  dialect: 'azureservicebus';
  connectionString: string;
}

export interface IRabbitMessagingClientOptions {
  dialect: 'rabbit';
  url: string;
}

export interface IMessageEnverlope<T> {
  firstSend: Date;
  latestSend: Date;
  message: T;
}
