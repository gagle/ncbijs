import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for MedGen requests. */
export interface MedGenClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a MedGen E-utilities request fails. */
export class MedGenHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (MedGen) returned status ${status}`);
    this.name = 'MedGenHttpError';
  }
}

/** Fetch JSON from a MedGen E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: MedGenClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new MedGenHttpError(status, body),
  });

  return (await response.json()) as T;
}
