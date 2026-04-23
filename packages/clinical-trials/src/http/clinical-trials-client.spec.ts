import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { ClinicalTrialsHttpError, fetchJson } from './clinical-trials-client';
import type { ClinicalTrialsClientConfig } from './clinical-trials-client';

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

function createConfig(): ClinicalTrialsClientConfig {
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
    const data = { totalStudies: 500000 };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>(
      'https://clinicaltrials.gov/api/v2/stats/size',
      createConfig(),
    );

    expect(result).toEqual(data);
  });

  it('should include Accept header', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://clinicaltrials.gov/api/v2/stats/size', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://clinicaltrials.gov/api/v2/stats/size', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://clinicaltrials.gov/api/v2/stats/size',
      config,
      expect.any(Object),
    );
  });

  it('should use ClinicalTrialsHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://clinicaltrials.gov/api/v2/stats/size', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(429, 'Too Many Requests');

    expect(error).toBeInstanceOf(ClinicalTrialsHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as ClinicalTrialsHttpError).status).toBe(429);
    expect((error as ClinicalTrialsHttpError).body).toBe('Too Many Requests');
    expect(error.name).toBe('ClinicalTrialsHttpError');
    expect(error.message).toBe('ClinicalTrials.gov API returned status 429');
  });
});
