import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { BioCHttpError, fetchText } from './bioc-client';
import type { BioCClientConfig } from './bioc-client';

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

function createConfig(): BioCClientConfig {
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
    mockedFetchWithRetry.mockResolvedValue(mockResponse('{"id":"123"}'));

    const result = await fetchText('https://example.com', createConfig());

    expect(result).toBe('{"id":"123"}');
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

  it('should use BioCHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse(''));
    await fetchText('https://example.com', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(404, 'Not Found');

    expect(error).toBeInstanceOf(BioCHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as BioCHttpError).status).toBe(404);
    expect((error as BioCHttpError).body).toBe('Not Found');
    expect(error.name).toBe('BioCHttpError');
    expect(error.message).toBe('BioC API returned status 404');
  });
});
