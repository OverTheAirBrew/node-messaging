import { MessagingClient } from '.';
import { Immediate } from './retry/immediate';

export module Created {
  export const Topic = 'testy.test.test';
  export interface Data {
    data: string;
  }
  export const Data: Data = {} as any;
}

export module Created2 {
  export const Topic = 'testy.test.test2';
  export interface Data {
    data: string;
  }
  export const Data: Data = {} as any;
}

Promise.resolve()
  .then(async () => {
    const serviceBusMessagingClient = new MessagingClient({
      serviceName: 'testing',
      dialect: 'azureservicebus',
      connectionString:
        'Endpoint=sb://otatesting.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=Sy91q3q39LRJhd/oeimf1S6xxNi2nsq/ivYPjgfj+BA=',
      backoff: new Immediate(5),
    });

    const rabbitMessagingClient = new MessagingClient({
      serviceName: 'testing',
      dialect: 'rabbit',
      url: 'amqp://guest:guest@localhost:5672/%2f',
      backoff: new Immediate(5),
    });

    rabbitMessagingClient.listenForFault(
      Created,
      () => {
        console.log('a');
      },
      {
        queueName: 'created.fault',
      },
    );

    rabbitMessagingClient.listenForMessage(
      Created,
      (message) => {
        throw new Error('');
        console.log(message);
      },
      { queueName: 'testing1' },
    );

    rabbitMessagingClient.listenForMessage(
      Created2,
      (message) => {
        console.log('TEST2');
      },
      { queueName: 'testing 2' },
    );

    await rabbitMessagingClient.sendMessage(Created)({
      data: 'hello',
    });

    // await serviceBusMessagingClient.listenForMessage(Created, (message) => {
    //   throw new Error('error');
    //   console.log(message);
    // });

    // await serviceBusMessagingClient.listenForFault(Created, (message) => {
    //   console.log('error');
    // });

    // await serviceBusMessagingClient.listenForMessage(Created2, (message) => {
    //   console.log('TEST2');
    // });

    // await serviceBusMessagingClient.sendMessage(Created)({
    //   data: 'hello',
    // });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
