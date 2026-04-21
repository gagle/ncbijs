import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface GtrClientConfig extends RetryConfig, EUtilsCredentials {}

export class GtrHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (GTR) returned status ${status}`);
    this.name = 'GtrHttpError';
  }
}

export async function fetchJson<T>(url: string, config: GtrClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new GtrHttpError(status, body),
  });

  return (await response.json()) as T;
}
