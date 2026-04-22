import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the PubTator3 API. */
export type PubTatorClientConfig = RetryConfig;

/** HTTP error thrown by the PubTator3 client. */
export class PubTatorHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `PubTator3 API returned status ${status}`);
    this.name = 'PubTatorHttpError';
  }
}

/** Fetch a JSON response from the PubTator3 API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: PubTatorClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new PubTatorHttpError(status, body),
  });

  return (await response.json()) as T;
}

/** Fetch a text response from the PubTator3 API with rate limiting and retry. */
export async function fetchText(
  url: string,
  config: PubTatorClientConfig,
  requestInit?: RequestInit,
): Promise<string> {
  const options = requestInit
    ? {
        request: requestInit,
        createError: (status: number, body: string) => new PubTatorHttpError(status, body),
      }
    : { createError: (status: number, body: string) => new PubTatorHttpError(status, body) };

  const response = await fetchWithRetry(url, config, options);

  return response.text();
}
