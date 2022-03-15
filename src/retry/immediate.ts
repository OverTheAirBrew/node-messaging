import { AbstractBackoff } from './abstractbackoff';

export class Immediate extends AbstractBackoff {
  constructor(retries: number) {
    super(retries);
  }

  public getWaitTime(retryNumber: number): number {
    return 0;
  }
}
