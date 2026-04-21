import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export type ICiteClientConfig = RetryConfig;

export class ICiteHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `iCite API returned status ${status}`);
    this.name = 'ICiteHttpError';
  }
}

export async function fetchJson<T>(url: string, config: ICiteClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ICiteHttpError(status, body),
  });

  return (await response.json()) as T;
}
