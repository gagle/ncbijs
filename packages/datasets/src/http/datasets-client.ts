import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface DatasetsClientConfig extends RetryConfig {
  readonly apiKey?: string;
}

export class DatasetsHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI Datasets API returned status ${status}`);
    this.name = 'DatasetsHttpError';
  }
}

export async function fetchJson<T>(url: string, config: DatasetsClientConfig): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.apiKey !== undefined) {
    headers['api-key'] = config.apiKey;
  }

  const response = await fetchWithRetry(url, config, {
    request: { headers },
    createError: (status, body) => new DatasetsHttpError(status, body),
  });

  return (await response.json()) as T;
}
