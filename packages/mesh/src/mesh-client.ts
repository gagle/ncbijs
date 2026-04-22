import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the MeSH API. */
export type MeSHClientConfig = RetryConfig;

/** HTTP error thrown by the MeSH client. */
export class MeSHHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `MeSH API returned status ${status}`);
    this.name = 'MeSHHttpError';
  }
}

/** Fetch a JSON response from the MeSH API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: MeSHClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new MeSHHttpError(status, body),
  });

  return (await response.json()) as T;
}
