import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for OMIM requests. */
export interface OmimClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when an OMIM E-utilities request fails. */
export class OmimHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (OMIM) returned status ${status}`);
    this.name = 'OmimHttpError';
  }
}

/** Fetch JSON from an OMIM E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: OmimClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new OmimHttpError(status, body),
  });

  return (await response.json()) as T;
}
