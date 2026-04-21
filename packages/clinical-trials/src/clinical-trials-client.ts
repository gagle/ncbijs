import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export type ClinicalTrialsClientConfig = RetryConfig;

export class ClinicalTrialsHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `ClinicalTrials.gov API returned status ${status}`);
    this.name = 'ClinicalTrialsHttpError';
  }
}

export async function fetchJson<T>(url: string, config: ClinicalTrialsClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ClinicalTrialsHttpError(status, body),
  });

  return (await response.json()) as T;
}
