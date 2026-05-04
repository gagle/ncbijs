import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the ClinicalTrials API. */
export type ClinicalTrialsClientConfig = RetryConfig;

/** HTTP error thrown by the ClinicalTrials client. */
export class ClinicalTrialsHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `ClinicalTrials.gov API returned status ${status}`);
    this.name = 'ClinicalTrialsHttpError';
  }
}

/** Fetch a JSON response from the ClinicalTrials.gov API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: ClinicalTrialsClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ClinicalTrialsHttpError(status, body),
  });

  return (await response.json()) as T;
}
