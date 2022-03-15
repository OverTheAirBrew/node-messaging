// import { expect } from 'chai';
// import { v4 as uuid } from 'node-uuid';
// import * as sinon from 'sinon';
// import RabbitMq from '../src/providers/rabbit-mq-old';
// import { snooze } from '../src/utils';

// export module TestingEvent {
//   export const Topic = 'testing.test.event';
//   export interface Data {
//     value: boolean;
//   }
//   export const Data: Data = {} as any;
// }

// describe('rabbit-mq', () => {
//   let client: RabbitMq;

//   let messageCounter: sinon.SinonStub;
//   let faultCounter: sinon.SinonStub;

//   beforeEach(() => {
//     client = new RabbitMq({
//       dialect: 'rabbit',
//       serviceName: 'testing',
//       url: 'amqp://guest:guest@localhost:5672/%2f',
//     });

//     messageCounter = sinon
//       .stub()
//       .onFirstCall()
//       .throws(new Error(''))
//       .onSecondCall()
//       .resolves();

//     faultCounter = sinon.stub().resolves();
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it.only('should send a message', async () => {
//     messageCounter.reset();
//     messageCounter.resolves();

//     await client.listenForMessage(TestingEvent, messageCounter, {
//       queueName: uuid(),
//     });

//     await client.sendMessage(TestingEvent)({
//       value: true,
//     });

//     await snooze(3000);

//     expect(messageCounter.calledOnce).to.be.true;
//   });

//   // it('should redeliver if there is a backoff supplied in the options', async () => {
//   //   client.listenForMessage(TestingEvent, messageCounter, {
//   //     backoffLogic: new Immediate(1),
//   //   });

//   //   await client.sendMessage(TestingEvent)({});

//   //   expect(messageCounter.callCount).to.equal(2);
//   // });

//   // it('should redeliver if there is a backoff supplied on the client', async () => {
//   //   client = new RabbitMq({
//   //     dialect: 'rabbit',
//   //     serviceName: 'testing',
//   //     url: 'amqp://guest:guest@localhost:5672/%2f',
//   //     backoff: new Immediate(1),
//   //   });

//   //   client.listenForMessage(TestingEvent, messageCounter, {});

//   //   await client.sendMessage(TestingEvent)({});

//   //   expect(messageCounter.callCount).to.equal(2);
//   // });

//   // it('should receive the fault messages', async () => {
//   //   messageCounter.reset();
//   //   messageCounter.throws(new Error(''));

//   //   client.listenForMessage(TestingEvent, messageCounter, {});
//   //   client.listenForFault(TestingEvent, faultCounter, {});

//   //   await client.sendMessage(TestingEvent)({});

//   //   expect(faultCounter.callCount).to.equal(1);
//   // });
// });
