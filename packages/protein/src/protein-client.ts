import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface ProteinClientConfig extends RetryConfig {
  readonly apiKey?: string;
}

export class ProteinHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI EFetch (protein) returned status ${status}`);
    this.name = 'ProteinHttpError';
  }
}

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
