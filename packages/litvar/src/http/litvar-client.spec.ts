import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { LitVarHttpError, fetchJson } from './litvar-client';
import type { LitVarClientConfig } from './litvar-client';

vi.mock('@ncbijs/rate-limiter', async (importOriginal) => {
  const original = await importOriginal<typeof import('@ncbijs/rate-limiter')>();
  return {
    ...original,
    fetchWithRetry: vi.fn(),
  };
});

import { fetchWithRetry } from '@ncbijs/rate-limiter';

const mockedFetchWithRetry = vi.mocked(fetchWithRetry);

beforeEach(() => {
  mockedFetchWithRetry.mockClear();
});

function createConfig(): LitVarClientConfig {
  return {
    maxRetries: 3,
    rateLimiter: { acquire: vi.fn() } as never,
  };
}

function mockResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('fetchJson', () => {
  it('should return parsed JSON from response', async () => {
    const data = { results: [{ rsid: 'rs328' }] };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/get/litvar/rs328',
      createConfig(),
    );

    expect(result).toEqual(data);
  });

  it('should include Accept header', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://example.com', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://example.com', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://example.com',
      config,
      expect.any(Object),
    );
  });

  it('should use LitVarHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://example.com', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(429, 'Too Many Requests');

    expect(error).toBeInstanceOf(LitVarHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as LitVarHttpError).status).toBe(429);
    expect((error as LitVarHttpError).body).toBe('Too Many Requests');
    expect(error.name).toBe('LitVarHttpError');
    expect(error.message).toBe('LitVar API returned status 429');
  });
});
