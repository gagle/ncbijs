import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { MedGenHttpError, fetchJson } from './medgen-client';
import type { MedGenClientConfig } from './medgen-client';

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

function createConfig(overrides?: Partial<MedGenClientConfig>): MedGenClientConfig {
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
    const data = { esearchresult: { count: '3' } };
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

  it('should use MedGenHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://api.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(500, 'Server Error');

    expect(error).toBeInstanceOf(MedGenHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as MedGenHttpError).status).toBe(500);
    expect((error as MedGenHttpError).body).toBe('Server Error');
    expect(error.name).toBe('MedGenHttpError');
    expect(error.message).toBe('NCBI E-utilities API (MedGen) returned status 500');
  });
});
