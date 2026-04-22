import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the LitVar API. */
export type LitVarClientConfig = RetryConfig;

/** HTTP error thrown by the LitVar client. */
export class LitVarHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `LitVar API returned status ${status}`);
    this.name = 'LitVarHttpError';
  }
}

/** Fetch a JSON response from the LitVar API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: LitVarClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new LitVarHttpError(status, body),
  });

  return (await response.json()) as T;
}
