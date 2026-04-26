import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the DailyMed API. */
export type DailyMedClientConfig = RetryConfig;

/** HTTP error thrown by the DailyMed client. */
export class DailyMedHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `DailyMed API returned status ${status}`);
    this.name = 'DailyMedHttpError';
  }
}

/** Fetch a JSON response from the DailyMed API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: DailyMedClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new DailyMedHttpError(status, body),
  });

  return (await response.json()) as T;
}
