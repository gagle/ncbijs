import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the iCite API. */
export type ICiteClientConfig = RetryConfig;

/** HTTP error thrown by the iCite client. */
export class ICiteHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `iCite API returned status ${status}`);
    this.name = 'ICiteHttpError';
  }
}

/** Fetch a JSON response from the iCite API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: ICiteClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ICiteHttpError(status, body),
  });

  return (await response.json()) as T;
}
