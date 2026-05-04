import type { TokenBucket } from '../token-bucket';

/** Configuration for retry behavior including max attempts and rate limiting. */
export interface RetryConfig {
  readonly maxRetries: number;
  readonly rateLimiter: TokenBucket;
}

/** Optional settings for a single fetch-with-retry call. */
export interface FetchRetryOptions {
  readonly request?: RequestInit;
  readonly createError?: (status: number, body: string) => Error;
  readonly sensitiveParams?: ReadonlyArray<string>;
}
