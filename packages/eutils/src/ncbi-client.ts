import createClient from 'openapi-fetch';
import type { Client, Middleware } from 'openapi-fetch';
import type { TokenBucket } from '@ncbijs/rate-limiter';
import { EUtilsHttpError } from './http-client';
import type { NcbiEUtilsPaths } from './interfaces/ncbi-paths.interface';

export interface NcbiClientConfig {
  readonly tool: string;
  readonly email: string;
  readonly apiKey?: string;
  readonly maxRetries: number;
  readonly rateLimiter: TokenBucket;
}

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const INITIAL_BACKOFF_MS = 500;
const MAX_JITTER_MS = 500;
const POST_ID_THRESHOLD = 200;
const POST_TERM_THRESHOLD = 300;
const FORCE_POST_PATHS = new Set(['/epost.fcgi']);

export function createNcbiClient(config: NcbiClientConfig): Client<NcbiEUtilsPaths> {
  const client = createClient<NcbiEUtilsPaths>({
    baseUrl: BASE_URL,
    fetch: createRetryFetch(config.rateLimiter, config.maxRetries),
  });

  client.use(
    createAuthMiddleware(config.tool, config.email, config.apiKey),
    createPostConversionMiddleware(),
  );

  return client;
}

function createAuthMiddleware(tool: string, email: string, apiKey?: string): Middleware {
  return {
    onRequest({ request }) {
      const url = new URL(request.url);
      url.searchParams.set('tool', tool);
      url.searchParams.set('email', email);
      if (apiKey) {
        url.searchParams.set('api_key', apiKey);
      }
      return new Request(url, request);
    },
  };
}

function createPostConversionMiddleware(): Middleware {
  return {
    onRequest({ request, schemaPath, params }) {
      const queryParams = params.query as Record<string, unknown> | undefined;
      const idValue = queryParams?.['id'];
      const termValue = queryParams?.['term'];
      const idExceedsThreshold = typeof idValue === 'string' && idValue.length > POST_ID_THRESHOLD;
      const termExceedsThreshold =
        typeof termValue === 'string' && termValue.length > POST_TERM_THRESHOLD;
      const needsPost =
        FORCE_POST_PATHS.has(schemaPath) || idExceedsThreshold || termExceedsThreshold;

      if (!needsPost) {
        return;
      }

      const url = new URL(request.url);
      const body = url.search.slice(1);
      url.search = '';

      return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    },
  };
}

function createRetryFetch(
  rateLimiter: TokenBucket,
  maxRetries: number,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await rateLimiter.acquire();

      let response: Response;
      try {
        response = await fetch(request.clone());
      } catch (err) {
        if (attempt < maxRetries && err instanceof TypeError) {
          await backoff(attempt);
          continue;
        }
        throw err;
      }

      if (response.ok) {
        return response;
      }

      const body = await response.text();

      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        await backoff(attempt);
        continue;
      }

      throw new EUtilsHttpError(response.status, body);
    }

    throw new EUtilsHttpError(0, 'Max retries exceeded');
  };
}

function backoff(attempt: number): Promise<void> {
  const ms = INITIAL_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * MAX_JITTER_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
