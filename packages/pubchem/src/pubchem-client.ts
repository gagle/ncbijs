import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export type PubChemClientConfig = RetryConfig;

export class PubChemHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `PubChem API returned status ${status}`);
    this.name = 'PubChemHttpError';
  }
}

export async function fetchJson<T>(url: string, config: PubChemClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new PubChemHttpError(status, body),
  });

  return (await response.json()) as T;
}
