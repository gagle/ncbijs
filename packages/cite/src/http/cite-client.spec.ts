import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { CiteHttpError, fetchText } from './cite-client';
import type { CiteClientConfig } from './cite-client';

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

function createConfig(): CiteClientConfig {
  return {
    maxRetries: 3,
    rateLimiter: { acquire: vi.fn() } as never,
  };
}

function mockResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(text),
  } as Response;
}

describe('fetchText', () => {
  it('should return text from response', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse('TY  - JOUR'));

    const result = await fetchText('https://example.com', createConfig());

    expect(result).toBe('TY  - JOUR');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse(''));
    const config = createConfig();

    await fetchText('https://example.com', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://example.com',
      config,
      expect.any(Object),
    );
  });

  it('should use CiteHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse(''));
    await fetchText('https://example.com', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(500, 'Server Error');

    expect(error).toBeInstanceOf(CiteHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as CiteHttpError).status).toBe(500);
    expect((error as CiteHttpError).body).toBe('Server Error');
    expect(error.name).toBe('CiteHttpError');
    expect(error.message).toBe('Citation Exporter API returned status 500');
  });
});
