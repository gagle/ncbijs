import type { EUtilsCredentials } from '@ncbijs/eutils/config';
import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface ClinVarClientConfig extends RetryConfig, EUtilsCredentials {}

export class ClinVarHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API returned status ${status}`);
    this.name = 'ClinVarHttpError';
  }
}

export async function fetchJson<T>(url: string, config: ClinVarClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ClinVarHttpError(status, body),
  });

  return (await response.json()) as T;
}
