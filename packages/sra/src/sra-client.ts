import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for SRA requests. */
export interface SraClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when an SRA E-utilities request fails. */
export class SraHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (SRA) returned status ${status}`);
    this.name = 'SraHttpError';
  }
}

/** Fetch JSON from an SRA E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: SraClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new SraHttpError(status, body),
  });

  return (await response.json()) as T;
}
