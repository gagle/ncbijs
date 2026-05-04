import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { RxNormHttpError, fetchJson } from './rxnorm-client';
import type { RxNormClientConfig } from './rxnorm-client';

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

function createConfig(): RxNormClientConfig {
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
    const data = { idGroup: { rxnormId: ['1191'] } };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>(
      'https://rxnav.nlm.nih.gov/REST/rxcui.json',
      createConfig(),
    );

    expect(result).toEqual(data);
  });

  it('should include Accept header', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://rxnav.nlm.nih.gov/REST/rxcui.json', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://rxnav.nlm.nih.gov/REST/rxcui.json', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://rxnav.nlm.nih.gov/REST/rxcui.json',
      config,
      expect.any(Object),
    );
  });

  it('should use RxNormHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://rxnav.nlm.nih.gov/REST/rxcui.json', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(503, 'Service Unavailable');

    expect(error).toBeInstanceOf(RxNormHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as RxNormHttpError).status).toBe(503);
    expect((error as RxNormHttpError).body).toBe('Service Unavailable');
    expect(error.name).toBe('RxNormHttpError');
    expect(error.message).toBe('RxNorm API returned status 503');
  });
});
