import createClient from 'openapi-fetch';
import type { Client, Middleware } from 'openapi-fetch';
import type { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchWithRetry } from '@ncbijs/rate-limiter';
import { EUtilsHttpError } from './http-client';
import type { paths } from './schema';

export interface NcbiClientConfig {
  readonly tool: string;
  readonly email: string;
  readonly apiKey?: string;
  readonly maxRetries: number;
  readonly rateLimiter: TokenBucket;
}

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const POST_ID_THRESHOLD = 200;
const POST_TERM_THRESHOLD = 300;
const FORCE_POST_PATHS = new Set(['/epost.fcgi']);

export function createNcbiClient(config: NcbiClientConfig): Client<paths> {
  const client = createClient<paths>({
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
    return fetchWithRetry(
      request,
      { maxRetries, rateLimiter },
      {
        createError: (status, body) => new EUtilsHttpError(status, body),
      },
    );
  };
}
