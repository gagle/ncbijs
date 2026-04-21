import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface CddClientConfig extends RetryConfig, EUtilsCredentials {}

export class CddHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (CDD) returned status ${status}`);
    this.name = 'CddHttpError';
  }
}

export async function fetchJson<T>(url: string, config: CddClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new CddHttpError(status, body),
  });

  return (await response.json()) as T;
}
