import type { RetryConfig, FetchRetryOptions } from './interfaces/fetch-retry.interface';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const SERVER_BUSY_STATUSES = new Set([429, 503]);
const TRANSIENT_INITIAL_BACKOFF_MS = 500;
const TRANSIENT_MAX_BACKOFF_MS = 8_000;
const SERVER_BUSY_INITIAL_BACKOFF_MS = 2_000;
const SERVER_BUSY_MAX_BACKOFF_MS = 30_000;
const RETRY_AFTER_CAP_MS = 60_000;
const MAX_JITTER_MS = 500;

/** Error thrown when an HTTP request fails after exhausting all retry attempts. */
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

/** Fetch a URL with rate limiting and exponential backoff retry on transient failures. */
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
        await sleep(transientBackoffMs(attempt));
        continue;
      }
      if (err instanceof TypeError && options?.sensitiveParams?.length) {
        throw new TypeError(redactParams(err.message, options.sensitiveParams), { cause: err });
      }
      throw err;
    }

    if (response.ok) {
      return response;
    }

    const responseBody = await response.text();

    if (RETRYABLE_STATUSES.has(response.status) && canRetry) {
      await sleep(retryDelayMs(response, attempt));
      continue;
    }

    if (options?.createError !== undefined) {
      throw options.createError(response.status, responseBody);
    }

    throw new HttpRetryError(response.status, responseBody);
  }
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfterMs = parseRetryAfter(response);
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, RETRY_AFTER_CAP_MS) + Math.random() * MAX_JITTER_MS;
  }
  if (SERVER_BUSY_STATUSES.has(response.status)) {
    return serverBusyBackoffMs(attempt);
  }
  return transientBackoffMs(attempt);
}

function transientBackoffMs(attempt: number): number {
  const exponential = TRANSIENT_INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  return Math.min(exponential, TRANSIENT_MAX_BACKOFF_MS) + Math.random() * MAX_JITTER_MS;
}

function serverBusyBackoffMs(attempt: number): number {
  const exponential = SERVER_BUSY_INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  return Math.min(exponential, SERVER_BUSY_MAX_BACKOFF_MS) + Math.random() * MAX_JITTER_MS;
}

function parseRetryAfter(response: Response): number | undefined {
  const value = response.headers?.get('retry-after');
  if (value === null || value === undefined) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(value);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, date - Date.now());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactParams(message: string, paramNames: ReadonlyArray<string>): string {
  let redacted = message;
  for (const name of paramNames) {
    redacted = redacted.replace(
      new RegExp(`([?&])${escapeRegExp(name)}=[^&]*`, 'g'),
      `$1${name}=[REDACTED]`,
    );
  }
  return redacted;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
