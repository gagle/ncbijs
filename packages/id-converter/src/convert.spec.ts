import { afterEach, describe, expect, it, vi } from 'vitest';
import { convert } from './convert';

function mockFetchJson(data: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchFailure(errorMessage: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(errorMessage)));
}

function buildApiResponse(
  records: ReadonlyArray<Record<string, unknown>>,
): Record<string, unknown> {
  return { status: 'ok', responseDate: '2024-01-01', request: '', records };
}

function buildRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    pmid: '12345678',
    pmcid: 'PMC1234567',
    doi: '10.1234/example',
    mid: 'NIHMS1234567',
    live: true,
    'release-date': '2024/01/15',
    ...overrides,
  };
}

describe('convert', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('basic conversion', () => {
    it('should convert single PMID to all ID types', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      const results = await convert(['12345678']);
      expect(results).toHaveLength(1);
      expect(results[0]!.pmid).toBe('12345678');
      expect(results[0]!.pmcid).toBe('PMC1234567');
      expect(results[0]!.doi).toBe('10.1234/example');
    });

    it('should convert single PMCID to all ID types', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ pmcid: 'PMC9999999' })]));
      const results = await convert(['PMC9999999']);
      expect(results).toHaveLength(1);
      expect(results[0]!.pmcid).toBe('PMC9999999');
    });

    it('should convert single DOI to all ID types', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ doi: '10.1038/test' })]));
      const results = await convert(['10.1038/test']);
      expect(results).toHaveLength(1);
      expect(results[0]!.doi).toBe('10.1038/test');
    });

    it('should convert single MID to all ID types', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ mid: 'NIHMS999' })]));
      const results = await convert(['NIHMS999']);
      expect(results).toHaveLength(1);
      expect(results[0]!.mid).toBe('NIHMS999');
    });

    it('should convert multiple IDs in single request', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ pmid: '111' }), buildRecord({ pmid: '222' })]));
      const results = await convert(['111', '222']);
      expect(results).toHaveLength(2);
      expect(results[0]!.pmid).toBe('111');
      expect(results[1]!.pmid).toBe('222');
    });

    it('should handle up to 200 IDs per request', async () => {
      const records = Array.from({ length: 200 }, (_, index) =>
        buildRecord({ pmid: String(index + 1) }),
      );
      mockFetchJson(buildApiResponse(records));
      const ids = Array.from({ length: 200 }, (_, index) => String(index + 1));
      const results = await convert(ids);
      expect(results).toHaveLength(200);
    });

    it('should throw when exceeding 200 IDs', async () => {
      const ids = Array.from({ length: 201 }, (_, index) => String(index + 1));
      await expect(convert(ids)).rejects.toThrow('Cannot convert more than 200 IDs');
    });
  });

  describe('response parsing', () => {
    it('should return pmid, pmcid, doi, mid for each ID', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      const results = await convert(['12345678']);
      const firstResult = results[0]!;
      expect(firstResult.pmid).toBe('12345678');
      expect(firstResult.pmcid).toBe('PMC1234567');
      expect(firstResult.doi).toBe('10.1234/example');
      expect(firstResult.mid).toBe('NIHMS1234567');
    });

    it('should return null for unavailable ID types', async () => {
      mockFetchJson(
        buildApiResponse([buildRecord({ pmcid: undefined, doi: undefined, mid: undefined })]),
      );
      const results = await convert(['12345678']);
      const firstResult = results[0]!;
      expect(firstResult.pmcid).toBeNull();
      expect(firstResult.doi).toBeNull();
      expect(firstResult.mid).toBeNull();
    });

    it('should return live flag', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ live: true })]));
      const results = await convert(['12345678']);
      expect(results[0]!.live).toBe(true);
    });

    it('should return releaseDate', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ 'release-date': '2024/06/01' })]));
      const results = await convert(['12345678']);
      expect(results[0]!.releaseDate).toBe('2024/06/01');
    });

    it('should return versions when requested', async () => {
      mockFetchJson(
        buildApiResponse([
          buildRecord({
            versions: [
              { pmcid: 'PMC1234567.1', current: 'false' },
              { pmcid: 'PMC1234567.2', current: 'true' },
            ],
          }),
        ]),
      );
      const results = await convert(['12345678'], { versions: true });
      expect(results[0]!.versions).toHaveLength(2);
      expect(results[0]!.versions![0]!.pmcid).toBe('PMC1234567.1');
      expect(results[0]!.versions![0]!.current).toBe(false);
      expect(results[0]!.versions![1]!.current).toBe(true);
    });

    it('should return aiid when requested', async () => {
      mockFetchJson(buildApiResponse([buildRecord({ aiid: '98765' })]));
      const results = await convert(['12345678'], { showaiid: true });
      expect(results[0]!.aiid).toBe('98765');
    });

    it('should parse versioned PMCIDs with current flag', async () => {
      mockFetchJson(
        buildApiResponse([
          buildRecord({
            versions: [{ pmcid: 'PMC123.1', current: 'true' }],
          }),
        ]),
      );
      const results = await convert(['PMC123'], { versions: true });
      expect(results[0]!.versions![0]!.pmcid).toBe('PMC123.1');
      expect(results[0]!.versions![0]!.current).toBe(true);
    });
  });

  describe('options', () => {
    it('should auto-detect ID type when idtype not specified', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678']);
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.has('idtype')).toBe(false);
    });

    it('should use specified idtype', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { idtype: 'pmid' });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('idtype')).toBe('pmid');
    });

    it('should request versions when versions is true', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { versions: true });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('versions')).toBe('yes');
    });

    it('should request AIID when showaiid is true', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { showaiid: true });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('showaiid')).toBe('yes');
    });

    it('should default to json format', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678']);
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('format')).toBe('json');
    });

    it('should support xml format', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { format: 'xml' });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('format')).toBe('json');
    });

    it('should support csv format', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { format: 'csv' });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('format')).toBe('json');
    });

    it('should support html format', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { format: 'html' });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('format')).toBe('json');
    });

    it('should include tool and email when provided', async () => {
      mockFetchJson(buildApiResponse([buildRecord()]));
      await convert(['12345678'], { tool: 'myapp', email: 'test@example.com' });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('tool')).toBe('myapp');
      expect(url.searchParams.get('email')).toBe('test@example.com');
    });
  });

  describe('error handling', () => {
    it('should throw on empty IDs array', async () => {
      await expect(convert([])).rejects.toThrow('ids array must not be empty');
    });

    it('should handle unknown IDs in response', async () => {
      mockFetchJson(
        buildApiResponse([{ errmsg: 'No match found for id: INVALID', pmid: 'INVALID' }]),
      );
      const results = await convert(['INVALID']);
      expect(results).toHaveLength(0);
    });

    it('should handle mixed valid and invalid IDs', async () => {
      mockFetchJson(
        buildApiResponse([
          buildRecord({ pmid: '11111' }),
          { errmsg: 'No match found', pmid: 'INVALID' },
        ]),
      );
      const results = await convert(['11111', 'INVALID']);
      expect(results).toHaveLength(1);
      expect(results[0]!.pmid).toBe('11111');
    });

    it('should throw on network error', async () => {
      mockFetchFailure('Failed to fetch');
      await expect(convert(['12345678'])).rejects.toThrow('Failed to fetch');
    });

    it('should throw on malformed response', async () => {
      mockFetchJson('not an object');
      await expect(convert(['12345678'])).rejects.toThrow('malformed response');
    });
  });
});
