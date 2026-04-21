import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { ICiteHttpError, fetchJson } from './icite-client';
import type { ICiteClientConfig } from './icite-client';

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

function createConfig(): ICiteClientConfig {
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
    const data = { data: [{ pmid: 12345 }] };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>(
      'https://icite.od.nih.gov/api/pubs',
      createConfig(),
    );

    expect(result).toEqual(data);
  });

  it('should include Accept header', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://icite.od.nih.gov/api/pubs', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://icite.od.nih.gov/api/pubs', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://icite.od.nih.gov/api/pubs',
      config,
      expect.any(Object),
    );
  });

  it('should use ICiteHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://icite.od.nih.gov/api/pubs', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(429, 'Too Many Requests');

    expect(error).toBeInstanceOf(ICiteHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as ICiteHttpError).status).toBe(429);
    expect((error as ICiteHttpError).body).toBe('Too Many Requests');
    expect(error.name).toBe('ICiteHttpError');
    expect(error.message).toBe('iCite API returned status 429');
  });
});
