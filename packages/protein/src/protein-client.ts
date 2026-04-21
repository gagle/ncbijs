import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

/** Retry configuration with optional API key for Protein requests. */
export interface ProteinClientConfig extends RetryConfig {
  readonly apiKey?: string;
}

/** HTTP error thrown when a Protein EFetch request fails. */
export class ProteinHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI EFetch (protein) returned status ${status}`);
    this.name = 'ProteinHttpError';
  }
}

/** Fetch text from a Protein EFetch endpoint with rate limiting and retry. */
export async function fetchText(url: string, config: ProteinClientConfig): Promise<string> {
  const headers: Record<string, string> = {};

  if (config.apiKey !== undefined) {
    headers['api-key'] = config.apiKey;
  }

  const response = await fetchWithRetry(url, config, {
    request: { headers },
    createError: (status, body) => new ProteinHttpError(status, body),
  });

  return response.text();
}
