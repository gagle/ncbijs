import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface SnpClientConfig extends RetryConfig {
  readonly apiKey?: string;
}

export class SnpHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI Variation API returned status ${status}`);
    this.name = 'SnpHttpError';
  }
}

export async function fetchJson<T>(url: string, config: SnpClientConfig): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.apiKey !== undefined) {
    headers['api-key'] = config.apiKey;
  }

  const response = await fetchWithRetry(url, config, {
    request: { headers },
    createError: (status, body) => new SnpHttpError(status, body),
  });

  return (await response.json()) as T;
}
