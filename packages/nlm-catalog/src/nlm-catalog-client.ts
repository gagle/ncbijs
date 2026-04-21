import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface NlmCatalogClientConfig extends RetryConfig, EUtilsCredentials {}

export class NlmCatalogHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (NLM Catalog) returned status ${status}`);
    this.name = 'NlmCatalogHttpError';
  }
}

export async function fetchJson<T>(url: string, config: NlmCatalogClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new NlmCatalogHttpError(status, body),
  });

  return (await response.json()) as T;
}
