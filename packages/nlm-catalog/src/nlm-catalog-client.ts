import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Combined retry and E-utilities credential configuration for NLM Catalog requests. */
export interface NlmCatalogClientConfig extends RetryConfig, EUtilsCredentials {}

/** HTTP error thrown when an NLM Catalog E-utilities request fails. */
export class NlmCatalogHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (NLM Catalog) returned status ${status}`);
    this.name = 'NlmCatalogHttpError';
  }
}

/** Fetch JSON from an NLM Catalog E-utilities endpoint with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: NlmCatalogClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new NlmCatalogHttpError(status, body),
  });

  return (await response.json()) as T;
}
