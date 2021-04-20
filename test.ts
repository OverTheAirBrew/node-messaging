import { AzureServiceBus } from './azure-service-bus';
import { Immediate } from './retry/immediate';
import { Interval } from './retry/interval';

export module Created {
  export const Topic = 'testy.test.test';
  export interface Data {
    data: string;
  }
  export const Data: Data = {} as any;
}

Promise.resolve()
  .then(async () => {
    const sb = new AzureServiceBus({
      connectionString:
        'Endpoint=sb://otatesting.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=Sy91q3q39LRJhd/oeimf1S6xxNi2nsq/ivYPjgfj+BA=',
      serviceName: 'testing',
      backoffLogic: new Interval([5, 10, 15]),
    });

    await sb.listenForMessage(
      Created,
      (message) => {
        console.log(message);
        throw new Error('AHHHH');
      },
      {
        backoffLogic: new Immediate(4),
      },
    );

    await sb.listenForFault(Created, async (message, error) => {
      console.log('DEADLETTER', error);
    });

    // setInterval(async () => {
    await sb.sendMessage(Created)({ data: 'hello' });
    // }, 5000);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
