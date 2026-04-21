import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for GTR requests. */
export interface GtrClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a GTR E-utilities request fails. */
export class GtrHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (GTR) returned status ${status}`);
    this.name = 'GtrHttpError';
  }
}

/** Fetch JSON from a GTR E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: GtrClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new GtrHttpError(status, body),
  });

  return (await response.json()) as T;
}
