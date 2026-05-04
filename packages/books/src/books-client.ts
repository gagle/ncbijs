import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for Books requests. */
export interface BooksClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a Books E-utilities request fails. */
export class BooksHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (Books) returned status ${status}`);
    this.name = 'BooksHttpError';
  }
}

/** Fetch JSON from a Books E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: BooksClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new BooksHttpError(status, body),
  });

  return (await response.json()) as T;
}
