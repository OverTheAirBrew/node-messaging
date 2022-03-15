export abstract class AbstractBackoff {
  maxRetries: number;

  constructor(maxRetries: number) {
    this.maxRetries = maxRetries;
  }

  public shouldRetry(retryNumber: number) {
    return retryNumber < this.maxRetries; //presumes starts at 0
  }

  public abstract getWaitTime(retryNumber: number): number;
}
