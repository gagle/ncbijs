import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface GeoClientConfig extends RetryConfig, EUtilsCredentials {}

export class GeoHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (GEO) returned status ${status}`);
    this.name = 'GeoHttpError';
  }
}

export async function fetchJson<T>(url: string, config: GeoClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new GeoHttpError(status, body),
  });

  return (await response.json()) as T;
}
