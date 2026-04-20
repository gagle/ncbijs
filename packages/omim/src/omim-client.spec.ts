import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { OmimHttpError, fetchJson } from './omim-client';
import type { OmimClientConfig } from './omim-client';

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

function createConfig(overrides?: Partial<OmimClientConfig>): OmimClientConfig {
  return {
    maxRetries: 3,
    rateLimiter: { acquire: vi.fn() } as never,
    ...overrides,
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
    const data = { esearchresult: { count: '5' } };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>('https://api.example.com/test', createConfig());

    expect(result).toEqual(data);
  });

  it('should pass Accept header via request options', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://api.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://api.example.com/test', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://api.example.com/test',
      config,
      expect.any(Object),
    );
  });

  it('should use OmimHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://api.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(400, 'Bad Request');

    expect(error).toBeInstanceOf(OmimHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as OmimHttpError).status).toBe(400);
    expect((error as OmimHttpError).body).toBe('Bad Request');
    expect(error.name).toBe('OmimHttpError');
    expect(error.message).toBe('NCBI E-utilities API (OMIM) returned status 400');
  });
});
