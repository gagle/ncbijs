import { afterEach, describe, expect, it, vi } from 'vitest';
import { Omim } from './omim';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function buildSearchResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    esearchresult: {
      count: '5',
      retmax: '20',
      retstart: '0',
      idlist: ['141900', '176930'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
): Record<string, unknown> {
  const uids = Object.keys(entries);
  return {
    result: {
      uids,
      ...entries,
    },
  };
}

function buildOmimEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '141900',
    oid: '*141900',
    title: 'HEMOGLOBIN--BETA LOCUS; HBB',
    alttitles: 'BETA-GLOBIN',
    locus: '16762915',
    ...overrides,
  };
}

describe('Omim', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim();

      const result = await omim.search('hemoglobin');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['141900', '176930']);
    });

    it('should build correct search URL', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim();

      await omim.search('Marfan syndrome');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=omim');
      expect(url).toContain('retmode=json');
      expect(url).toContain('Marfan+syndrome');
    });

    it('should include retmax when provided', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim();

      await omim.search('hemoglobin', { retmax: 10 });

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('retmax=10');
    });

    it('should include credentials when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim({
        apiKey: 'test-key',
        tool: 'my-tool',
        email: 'test@example.com',
      });

      await omim.search('hemoglobin');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('api_key=test-key');
      expect(url).toContain('tool=my-tool');
      expect(url).toContain('email=test%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const omim = new Omim();

      const result = await omim.search('nonexistent');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch entries by IDs', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '141900': buildOmimEntry(),
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries).toHaveLength(1);
      expect(entries[0]?.uid).toBe('141900');
      expect(entries[0]?.mimNumber).toBe('141900');
      expect(entries[0]?.prefix).toBe('*');
      expect(entries[0]?.title).toBe('HEMOGLOBIN--BETA LOCUS; HBB');
      expect(entries[0]?.alternativeTitles).toBe('BETA-GLOBIN');
      expect(entries[0]?.geneMapLocus).toBe('16762915');
    });

    it('should build correct fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({ '141900': buildOmimEntry() }));
      const omim = new Omim();

      await omim.fetch(['141900', '176930']);

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=omim');
      expect(url).toContain('id=141900%2C176930');
    });

    it('should return empty array for empty ids', async () => {
      const omim = new Omim();

      const entries = await omim.fetch([]);

      expect(entries).toEqual([]);
    });

    it('should skip entries with errors', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '141900': { error: 'some error' },
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries).toEqual([]);
    });

    it('should skip non-object entries', async () => {
      mockFetchJson({
        result: {
          uids: ['141900'],
          '141900': 'not-an-object',
        },
      });
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries).toEqual([]);
    });

    it('should handle missing result', async () => {
      mockFetchJson({});
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries).toEqual([]);
    });

    it('should parse phenotype prefix (#)', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '176930': buildOmimEntry({ uid: '176930', oid: '#176930' }),
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['176930']);

      expect(entries[0]?.prefix).toBe('#');
      expect(entries[0]?.mimNumber).toBe('176930');
    });

    it('should handle entry with no prefix', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '100100': buildOmimEntry({ uid: '100100', oid: '100100' }),
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['100100']);

      expect(entries[0]?.prefix).toBe('');
      expect(entries[0]?.mimNumber).toBe('100100');
    });

    it('should handle empty oid', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '141900': buildOmimEntry({ oid: '' }),
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries[0]?.prefix).toBe('');
      expect(entries[0]?.mimNumber).toBe('');
    });

    it('should handle missing optional fields', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '141900': { uid: '141900' },
        }),
      );
      const omim = new Omim();

      const entries = await omim.fetch(['141900']);

      expect(entries[0]?.title).toBe('');
      expect(entries[0]?.alternativeTitles).toBe('');
      expect(entries[0]?.geneMapLocus).toBe('');
    });
  });

  describe('searchAndFetch', () => {
    it('should search then fetch results', async () => {
      const searchResponse = buildSearchResponse({ idlist: ['141900'] });
      const summaryResponse = buildSummaryResponse({
        '141900': buildOmimEntry(),
      });

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(searchResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(summaryResponse),
          }),
      );

      const omim = new Omim();
      const entries = await omim.searchAndFetch('HBB');

      expect(entries).toHaveLength(1);
      expect(entries[0]?.title).toBe('HEMOGLOBIN--BETA LOCUS; HBB');
    });

    it('should return empty array when search finds nothing', async () => {
      mockFetchJson(buildSearchResponse({ count: '0', idlist: [] }));
      const omim = new Omim();

      const entries = await omim.searchAndFetch('nonexistent');

      expect(entries).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim();

      await omim.search('test');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should use higher rate limit with api key', async () => {
      mockFetchJson(buildSearchResponse());
      const omim = new Omim({ apiKey: 'test-key' });

      await omim.search('test');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('api_key=test-key');
    });
  });
});
