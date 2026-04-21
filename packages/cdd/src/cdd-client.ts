import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for CDD requests. */
export interface CddClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a CDD E-utilities request fails. */
export class CddHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (CDD) returned status ${status}`);
    this.name = 'CddHttpError';
  }
}

/** Fetch JSON from a CDD E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: CddClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new CddHttpError(status, body),
  });

  return (await response.json()) as T;
}
