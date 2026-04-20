import type { TokenBucket } from '../token-bucket';

export interface RetryConfig {
  readonly maxRetries: number;
  readonly rateLimiter: TokenBucket;
}

export interface FetchRetryOptions {
  readonly request?: RequestInit;
  readonly createError?: (status: number, body: string) => Error;
}
