import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for dbVar requests. */
export interface DbVarClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a dbVar E-utilities request fails. */
export class DbVarHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (dbVar) returned status ${status}`);
    this.name = 'DbVarHttpError';
  }
}

/** Fetch JSON from a dbVar E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: DbVarClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new DbVarHttpError(status, body),
  });

  return (await response.json()) as T;
}
