import { HttpRetryError, TokenBucket, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** HTTP client configuration for the Clinical Tables API. */
export type ClinicalTablesClientConfig = RetryConfig;

/** HTTP error thrown by the Clinical Tables client. */
export class ClinicalTablesHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `Clinical Tables API returned status ${status}`);
    this.name = 'ClinicalTablesHttpError';
  }
}

const DEFAULT_REQUESTS_PER_SECOND = 3;

const defaultConfig: ClinicalTablesClientConfig = {
  maxRetries: 3,
  rateLimiter: new TokenBucket({ requestsPerSecond: DEFAULT_REQUESTS_PER_SECOND }),
};

/** Resolve the client config, falling back to the module-level default. */
export function resolveConfig(config?: ClinicalTablesClientConfig): ClinicalTablesClientConfig {
  return config ?? defaultConfig;
}

/** Fetch a JSON response from the Clinical Tables API with rate limiting and retry. */
export async function fetchJson<T>(url: string, config: ClinicalTablesClientConfig): Promise<T> {
  const response = await fetchWithRetry(url, config, {
    request: { headers: { Accept: 'application/json' } },
    createError: (status, body) => new ClinicalTablesHttpError(status, body),
  });

  return (await response.json()) as T;
}
