import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for GEO requests. */
export interface GeoClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a GEO E-utilities request fails. */
export class GeoHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (GEO) returned status ${status}`);
    this.name = 'GeoHttpError';
  }
}

/** Fetch JSON from a GEO E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: GeoClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new GeoHttpError(status, body),
  });

  return (await response.json()) as T;
}
