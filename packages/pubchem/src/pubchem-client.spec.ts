import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRetryError } from '@ncbijs/rate-limiter';
import { PubChemHttpError, fetchJson } from './pubchem-client';
import type { PubChemClientConfig } from './pubchem-client';

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

function createConfig(): PubChemClientConfig {
  return {
    maxRetries: 3,
    rateLimiter: { acquire: vi.fn() } as never,
  };
}

function mockResponse(data: unknown, contentType = 'application/json'): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    headers: new Headers({ 'content-type': contentType }),
  } as Response;
}

describe('fetchJson', () => {
  it('should return parsed JSON from response', async () => {
    const data = { PropertyTable: { Properties: [{ CID: 2244 }] } };
    mockedFetchWithRetry.mockResolvedValue(mockResponse(data));

    const result = await fetchJson<typeof data>('https://pubchem.example.com/test', createConfig());

    expect(result).toEqual(data);
  });

  it('should pass Accept header via request options', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));

    await fetchJson('https://pubchem.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const headers = callOptions?.request?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('application/json');
  });

  it('should pass config to fetchWithRetry', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    const config = createConfig();

    await fetchJson('https://pubchem.example.com/test', config);

    expect(mockedFetchWithRetry).toHaveBeenCalledWith(
      'https://pubchem.example.com/test',
      config,
      expect.any(Object),
    );
  });

  it('should throw HttpRetryError when content-type is not JSON', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}, 'application/zip'));

    await expect(fetchJson('https://pubchem.example.com/test', createConfig())).rejects.toThrow(
      'Expected JSON but received content-type: application/zip',
    );
  });

  it('should use PubChemHttpError via createError factory', async () => {
    mockedFetchWithRetry.mockResolvedValue(mockResponse({}));
    await fetchJson('https://pubchem.example.com/test', createConfig());

    const callOptions = mockedFetchWithRetry.mock.calls[0]![2];
    const error = callOptions!.createError!(404, 'Not Found');

    expect(error).toBeInstanceOf(PubChemHttpError);
    expect(error).toBeInstanceOf(HttpRetryError);
    expect((error as PubChemHttpError).status).toBe(404);
    expect((error as PubChemHttpError).body).toBe('Not Found');
    expect(error.name).toBe('PubChemHttpError');
    expect(error.message).toBe('PubChem API returned status 404');
  });
});
