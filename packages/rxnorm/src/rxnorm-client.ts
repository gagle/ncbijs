import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the RxNorm API. */
export type RxNormClientConfig = RetryConfig;

/** HTTP error thrown by the RxNorm client. */
export class RxNormHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `RxNorm API returned status ${status}`);
    this.name = 'RxNormHttpError';
  }
}

/** Fetch a JSON response from the RxNorm API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: RxNormClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new RxNormHttpError(status, body),
  });

  return (await response.json()) as T;
}
