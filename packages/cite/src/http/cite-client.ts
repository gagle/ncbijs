import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the Citation Exporter API. */
export type CiteClientConfig = RetryConfig;

/** HTTP error thrown by the Citation Exporter client. */
export class CiteHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `Citation Exporter API returned status ${status}`);
    this.name = 'CiteHttpError';
  }
}

/** Fetch a text response from the Citation Exporter API with rate limiting and retry. */
export async function fetchText(url: string, config: CiteClientConfig): Promise<string> {
  const response = await fetchWithRetry(url, config, {
    createError: (status, body) => new CiteHttpError(status, body),
  });

  return response.text();
}
