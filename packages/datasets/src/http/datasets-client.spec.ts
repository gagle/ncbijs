import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { DatasetsHttpError, fetchJson } from './datasets-client';
import type { DatasetsClientConfig } from './datasets-client';

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

function createConfig(overrides?: Partial<DatasetsClientConfig>): DatasetsClientConfig {
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
    const data = { reports: [{ gene: { gene_id: 672 } }] };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>('https://api.example.com/test', createConfig());

    expect(result).toEqual(data);
  });

  it('should include api-key header when configured', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig({ apiKey: 'test-key' });

    await fetchJson('https://api.example.com/test', config);

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['api-key']).toBe('test-key');
  });

  it('should not include api-key header when not configured', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://api.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['api-key']).toBeUndefined();
  });

  it('should include Accept header', async () => {
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

  it('should use DatasetsHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://api.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(400, 'Bad Request');

    expect(error).toBeInstanceOf(DatasetsHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as DatasetsHttpError).status).toBe(400);
    expect((error as DatasetsHttpError).body).toBe('Bad Request');
    expect(error.name).toBe('DatasetsHttpError');
    expect(error.message).toBe('NCBI Datasets API returned status 400');
  });
});
