import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export type RxNormClientConfig = RetryConfig;

export class RxNormHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `RxNorm API returned status ${status}`);
    this.name = 'RxNormHttpError';
  }
}

export async function fetchJson<T>(url: string, config: RxNormClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new RxNormHttpError(status, body),
  });

  return (await response.json()) as T;
}
