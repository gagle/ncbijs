import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenBucket } from './token-bucket';
import { HttpRetryError, fetchWithRetry } from './fetch-with-retry';
import type { RetryConfig } from './interfaces/fetch-retry.interface';

function createConfig(overrides?: Partial<RetryConfig>): RetryConfig {
  return {
    maxRetries: 3,
    rateLimiter: new TokenBucket({ requestsPerSecond: 100 }),
    ...overrides,
  };
}

function mockFetchOk(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve(JSON.parse(body)),
    }),
  );
}

function mockFetchError(status: number, body = ''): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

describe('fetchWithRetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return response on success', async () => {
    mockFetchOk('{"ok":true}');

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(response.ok).toBe(true);
    const json = await response.json();
    expect(json).toEqual({ ok: true });
  });

  it('should pass request init options to fetch', async () => {
    mockFetchOk('{}');

    await fetchWithRetry('https://example.com/test', createConfig(), {
      request: { headers: { Accept: 'application/json' } },
    });

    const fetchCall = vi.mocked(fetch).mock.calls[0]!;
    const headers = fetchCall[1]?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should clone Request input on each attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const request = new Request('https://example.com/test', { method: 'POST', body: 'data' });
    const response = await fetchWithRetry(request, createConfig());

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstArg0 = fetchMock.mock.calls[0]![0] as Request;
    const firstArg1 = fetchMock.mock.calls[1]![0] as Request;
    expect(firstArg0).not.toBe(request);
    expect(firstArg1).not.toBe(request);
  });

  it('should throw HttpRetryError on non-retryable status', async () => {
    mockFetchError(400, 'Bad Request');

    await expect(fetchWithRetry('https://example.com/test', createConfig())).rejects.toThrow(
      HttpRetryError,
    );
  });

  it('should include status and body in HttpRetryError', async () => {
    mockFetchError(404, 'Not Found');

    try {
      await fetchWithRetry('https://example.com/test', createConfig());
      expect.unreachable('Should have thrown');
    } catch (err) {
      const httpErr = err as HttpRetryError;
      expect(httpErr.status).toBe(404);
      expect(httpErr.body).toBe('Not Found');
      expect(httpErr.name).toBe('HttpRetryError');
      expect(httpErr.message).toBe('HTTP request failed with status 404');
    }
  });

  it('should use createError factory when provided', async () => {
    mockFetchError(400, 'Bad Request');

    class CustomError extends Error {
      public readonly status: number;
      constructor(status: number, body: string) {
        super(`Custom: ${body}`);
        this.name = 'CustomError';
        this.status = status;
      }
    }

    await expect(
      fetchWithRetry('https://example.com/test', createConfig(), {
        createError: (status, body) => new CustomError(status, body),
      }),
    ).rejects.toThrow(CustomError);
  });

  it('should retry on 429 status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500 status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(await response.text()).toBe('ok');
  });

  it('should retry on 502 status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(await response.text()).toBe('ok');
  });

  it('should retry on 503 status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(await response.text()).toBe('ok');
  });

  it('should retry on network error (TypeError)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ok') });
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchWithRetry('https://example.com/test', createConfig());

    expect(await response.text()).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries on persistent 500', async () => {
    mockFetchError(500, 'Server Error');

    await expect(
      fetchWithRetry('https://example.com/test', createConfig({ maxRetries: 0 })),
    ).rejects.toThrow(HttpRetryError);
  });

  it('should throw network error after max retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      fetchWithRetry('https://example.com/test', createConfig({ maxRetries: 0 })),
    ).rejects.toThrow(TypeError);
  });

  it('should not retry non-TypeError exceptions', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('unexpected'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry('https://example.com/test', createConfig())).rejects.toThrow(
      'unexpected',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should use custom error message in HttpRetryError', async () => {
    mockFetchError(418, 'Teapot');

    try {
      await fetchWithRetry('https://example.com/test', createConfig());
      expect.unreachable('Should have thrown');
    } catch (err) {
      const httpErr = err as HttpRetryError;
      expect(httpErr.message).toBe('HTTP request failed with status 418');
    }
  });

  it('should respect maxRetries count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('error'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWithRetry('https://example.com/test', createConfig({ maxRetries: 2 })),
    ).rejects.toThrow(HttpRetryError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should not retry 400 status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithRetry('https://example.com/test', createConfig())).rejects.toThrow(
      HttpRetryError,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
