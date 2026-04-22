import { HttpRetryError, TokenBucket, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the ID Converter API. */
export type IdConverterClientConfig = RetryConfig;

/** HTTP error thrown by the ID Converter client. */
export class IdConverterHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `ID Converter API returned status ${status}`);
    this.name = 'IdConverterHttpError';
  }
}

const DEFAULT_REQUESTS_PER_SECOND = 3;

const defaultConfig: IdConverterClientConfig = {
  maxRetries: 3,
  rateLimiter: new TokenBucket({ requestsPerSecond: DEFAULT_REQUESTS_PER_SECOND }),
};

/** Resolve the client config, falling back to the module-level default. */
export function resolveConfig(config?: IdConverterClientConfig): IdConverterClientConfig {
  return config ?? defaultConfig;
}

/** Fetch a JSON response from the ID Converter API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: IdConverterClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new IdConverterHttpError(status, body),
  });

  return (await response.json()) as T;
}
