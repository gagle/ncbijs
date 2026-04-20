import type { RetryConfig, FetchRetryOptions } from './interfaces/fetch-retry.interface';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const INITIAL_BACKOFF_MS = 500;
const MAX_JITTER_MS = 500;

export class HttpRetryError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? `HTTP request failed with status ${status}`);
    this.name = 'HttpRetryError';
    this.status = status;
    this.body = body;
  }
}

export async function fetchWithRetry(
  input: string | Request,
  config: RetryConfig,
  options?: FetchRetryOptions,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < config.maxRetries;

    await config.rateLimiter.acquire();

    let response: Response;
    try {
      response =
        input instanceof Request
          ? await fetch(input.clone(), options?.request)
          : await fetch(input, options?.request);
    } catch (err) {
      if (canRetry && err instanceof TypeError) {
        await backoff(attempt);
        continue;
      }
      throw err;
    }

    if (response.ok) {
      return response;
    }

    const responseBody = await response.text();

    if (RETRYABLE_STATUSES.has(response.status) && canRetry) {
      await backoff(attempt);
      continue;
    }

    if (options?.createError !== undefined) {
      throw options.createError(response.status, responseBody);
    }

    throw new HttpRetryError(response.status, responseBody);
  }
}

function backoff(attempt: number): Promise<void> {
  const ms = INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * MAX_JITTER_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
