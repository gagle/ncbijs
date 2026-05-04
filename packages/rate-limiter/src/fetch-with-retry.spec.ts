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

  describe('when the response includes a Retry-After header in seconds', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should wait the specified seconds before retrying', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'retry-after': '10' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig());

      await vi.advanceTimersByTimeAsync(9_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2_000);
      const response = await promise;
      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the response includes a Retry-After header as an HTTP date', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should wait until that date before retrying', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': 'Thu, 01 Jan 2026 00:00:15 GMT' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig());

      await vi.advanceTimersByTimeAsync(14_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2_000);
      const response = await promise;
      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry immediately when the date is in the past', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'retry-after': 'Wed, 31 Dec 2025 23:59:00 GMT' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig());

      await vi.advanceTimersByTimeAsync(600);
      const response = await promise;
      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('when Retry-After exceeds the cap', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cap the wait at 60 seconds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'retry-after': '600' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig());

      await vi.advanceTimersByTimeAsync(60_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_000);
      const response = await promise;
      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('when Retry-After is malformed', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fall back to status-based backoff on a 503', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'retry-after': 'not-a-valid-value' }),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig());

      await vi.advanceTimersByTimeAsync(1_500);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2_000);
      const response = await promise;
      expect(await response.text()).toBe('ok');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('when retrying repeatedly on a 503 without Retry-After', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cap server-busy backoff at 30 seconds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig({ maxRetries: 6 }));

      await vi.advanceTimersByTimeAsync(2_500);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(4_500);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(8_500);
      expect(fetchMock).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(16_500);
      expect(fetchMock).toHaveBeenCalledTimes(5);

      await vi.advanceTimersByTimeAsync(30_500);
      expect(fetchMock).toHaveBeenCalledTimes(6);

      const response = await promise;
      expect(await response.text()).toBe('ok');
    });
  });

  describe('when retrying repeatedly on a 500', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cap transient backoff at 8 seconds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve('ok'),
        });
      vi.stubGlobal('fetch', fetchMock);

      const promise = fetchWithRetry('https://example.com/test', createConfig({ maxRetries: 6 }));

      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1_500);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(2_500);
      expect(fetchMock).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(4_500);
      expect(fetchMock).toHaveBeenCalledTimes(5);

      await vi.advanceTimersByTimeAsync(8_500);
      expect(fetchMock).toHaveBeenCalledTimes(6);

      const response = await promise;
      expect(await response.text()).toBe('ok');
    });
  });
});
