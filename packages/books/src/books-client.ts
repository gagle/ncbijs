import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface BooksClientConfig extends RetryConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
}

export class BooksHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI E-utilities API (Books) returned status ${status}`);
    this.name = 'BooksHttpError';
  }
}

export async function fetchJson<T>(url: string, config: BooksClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new BooksHttpError(status, body),
  });

  return (await response.json()) as T;
}
