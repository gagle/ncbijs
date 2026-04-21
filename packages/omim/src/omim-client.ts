import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface OmimClientConfig extends RetryConfig, EUtilsCredentials {}

export class OmimHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (OMIM) returned status ${status}`);
    this.name = 'OmimHttpError';
  }
}

export async function fetchJson<T>(url: string, config: OmimClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new OmimHttpError(status, body),
  });

  return (await response.json()) as T;
}
