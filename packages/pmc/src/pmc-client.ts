import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the PMC OA/OAI API. */
export type PMCClientConfig = RetryConfig;

/** HTTP error thrown by the PMC client. */
export class PMCHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `PMC API returned status ${status}`);
    this.name = 'PMCHttpError';
  }
}

/** Fetch a JSON response from the PMC API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: PMCClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new PMCHttpError(status, body),
  });

  return (await response.json()) as T;
}

/** Fetch a text response from the PMC API with rate limiting and retry. */
export async function fetchText(url: string, config: PMCClientConfig): Promise<string> {
  const response = await fetchWithRetry(url, config, {
    createError: (status, body) => new PMCHttpError(status, body),
  });

  return response.text();
}
