import { HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type { RetryConfig } from '@ncbijs/rate-limiter';

export interface NucleotideClientConfig extends RetryConfig {
  readonly apiKey?: string;
}

export class NucleotideHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `NCBI EFetch (nucleotide) returned status ${status}`);
    this.name = 'NucleotideHttpError';
  }
}

export async function fetchText(url: string, config: NucleotideClientConfig): Promise<string> {
  const headers: Record<string, string> = {};

  if (config.apiKey !== undefined) {
    headers['api-key'] = config.apiKey;
  }

  const response = await fetchWithRetry(url, config, {
    request: { headers },
    createError: (status, body) => new NucleotideHttpError(status, body),
  });

  return response.text();
}
