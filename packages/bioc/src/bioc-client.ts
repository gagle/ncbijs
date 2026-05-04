import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the BioC API. */
export type BioCClientConfig = RetryConfig;

/** HTTP error thrown by the BioC client. */
export class BioCHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `BioC API returned status ${status}`);
    this.name = 'BioCHttpError';
  }
}

/** Fetch a text response from the BioC API with rate limiting and retry. */
export async function fetchText(url: string, config: BioCClientConfig): Promise<string> {
  const response = await fetchWithRetry(url, config, {
    createError: (status, body) => new BioCHttpError(status, body),
  });

  return response.text();
}
