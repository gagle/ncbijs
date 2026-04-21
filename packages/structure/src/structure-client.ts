import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for Structure requests. */
export interface StructureClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when a Structure E-utilities request fails. */
export class StructureHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (Structure) returned status ${status}`);
    this.name = 'StructureHttpError';
  }
}

/** Fetch JSON from a Structure E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: StructureClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new StructureHttpError(status, body),
  });

  return (await response.json()) as T;
}
