// import { expect } from 'chai';
// import * as sinon from 'sinon';
// import InMemory from '../src/providers/in-memory';
// import { Immediate } from '../src/retry/immediate';

// export module TestingEvent {
//   export const Topic = 'testing.test.event';
//   export interface Data {}
//   export const Data: Data = {} as any;
// }

// describe('in-memory', () => {
//   let client: InMemory;

//   let messageCounter: sinon.SinonStub;
//   let faultCounter: sinon.SinonStub;

//   beforeEach(() => {
//     client = new InMemory({
//       dialect: 'in-memory',
//       serviceName: 'testing',
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

//   it('should send a message', async () => {
//     messageCounter.reset();
//     messageCounter.resolves();

//     client.listenForMessage(TestingEvent, messageCounter, {});
//     await client.sendMessage(TestingEvent)({});
//     expect(messageCounter.calledOnce).to.be.true;
//   });

//   it('should redeliver if there is a backoff supplied in the options', async () => {
//     client.listenForMessage(TestingEvent, messageCounter, {
//       backoffLogic: new Immediate(1),
//     });

//     await client.sendMessage(TestingEvent)({});

//     expect(messageCounter.callCount).to.equal(2);
//   });

//   it('should redeliver if there is a backoff supplied on the client', async () => {
//     client = new InMemory({
//       dialect: 'in-memory',
//       serviceName: 'testing',
//       backoff: new Immediate(1),
//     });

//     client.listenForMessage(TestingEvent, messageCounter, {});

//     await client.sendMessage(TestingEvent)({});

//     expect(messageCounter.callCount).to.equal(2);
//   });

//   it('should receive the fault messages', async () => {
//     messageCounter.reset();
//     messageCounter.throws(new Error(''));

//     client.listenForMessage(TestingEvent, messageCounter, {});
//     client.listenForFault(TestingEvent, faultCounter, {});

//     await client.sendMessage(TestingEvent)({});

//     expect(faultCounter.callCount).to.equal(1);
//   });
// });
