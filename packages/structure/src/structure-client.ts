import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface StructureClientConfig extends RetryConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
}

export class StructureHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (Structure) returned status ${status}`);
    this.name = 'StructureHttpError';
  }
}

export async function fetchJson<T>(url: string, config: StructureClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new StructureHttpError(status, body),
  });

  return (await response.json()) as T;
}
