import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface SraClientConfig extends RetryConfig, EUtilsCredentials {}

export class SraHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (SRA) returned status ${status}`);
    this.name = 'SraHttpError';
  }
}

export async function fetchJson<T>(url: string, config: SraClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new SraHttpError(status, body),
  });

  return (await response.json()) as T;
}
