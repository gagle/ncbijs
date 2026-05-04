import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cdd } from './cdd';

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
      idlist: ['223044', '223045'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
  uids?: ReadonlyArray<string>,
): Record<string, unknown> {
  const entryUids = uids ?? Object.keys(entries);
  return {
    result: {
      uids: entryUids,
      ...entries,
    },
  };
}

function buildCddEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '223044',
    accession: 'PHA03325',
    title: 'PHA03325',
    subtitle: '',
    abstract: 'nuclear-egress-membrane-like protein; Provisional',
    database: 'Prk',
    organism: 'Betaherpesvirinae',
    pubdate: '2010/12/09 00:00',
    entrezdate: '2024/03/28 00:00',
    pssmlength: '418',
    structurerepresentative: '',
    numbersites: '',
    sitedescriptions: [],
    status: '',
    livepssmid: '',
    ...overrides,
  };
}

describe('Cdd', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd();

      const result = await cdd.search('kinase');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['223044', '223045']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd();

      await cdd.search('zinc finger');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=cdd');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=zinc+finger');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd();

      await cdd.search('kinase', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd();

      await cdd.search('kinase');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd({ apiKey: 'test-key' });

      await cdd.search('kinase');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd({ tool: 'my-app', email: 'user@example.com' });

      await cdd.search('kinase');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const cdd = new Cdd();

      const result = await cdd.search('kinase');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const cdd = new Cdd();

      const result = await cdd.search('kinase');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch record details and map all fields', async () => {
      const entry = buildCddEntry();
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('223044');
      expect(records[0]!.accession).toBe('PHA03325');
      expect(records[0]!.title).toBe('PHA03325');
      expect(records[0]!.subtitle).toBe('');
      expect(records[0]!.abstract).toBe('nuclear-egress-membrane-like protein; Provisional');
      expect(records[0]!.database).toBe('Prk');
      expect(records[0]!.organism).toBe('Betaherpesvirinae');
      expect(records[0]!.publicationDate).toBe('2010/12/09 00:00');
      expect(records[0]!.entrezDate).toBe('2024/03/28 00:00');
      expect(records[0]!.pssmLength).toBe(418);
      expect(records[0]!.structureRepresentative).toBe('');
      expect(records[0]!.numberOfSites).toBe(0);
      expect(records[0]!.siteDescriptions).toEqual([]);
      expect(records[0]!.status).toBe('');
      expect(records[0]!.livePssmId).toBe('');
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const cdd = new Cdd();

      await cdd.fetch(['223044', '223045']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=cdd');
      expect(url).toContain('id=223044%2C223045');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const cdd = new Cdd();

      const records = await cdd.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildCddEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '223044': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['223044', '999'],
        ),
      );
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('223044');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records).toEqual([]);
    });

    it('should handle record with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const cdd = new Cdd();

      const records = await cdd.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.accession).toBe('');
      expect(records[0]!.title).toBe('');
      expect(records[0]!.subtitle).toBe('');
      expect(records[0]!.abstract).toBe('');
      expect(records[0]!.database).toBe('');
      expect(records[0]!.organism).toBe('');
      expect(records[0]!.publicationDate).toBe('');
      expect(records[0]!.entrezDate).toBe('');
      expect(records[0]!.pssmLength).toBe(0);
      expect(records[0]!.structureRepresentative).toBe('');
      expect(records[0]!.numberOfSites).toBe(0);
      expect(records[0]!.siteDescriptions).toEqual([]);
      expect(records[0]!.status).toBe('');
      expect(records[0]!.livePssmId).toBe('');
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { accession: 'cd00001' } }, ['1']));
      const cdd = new Cdd();

      const records = await cdd.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.accession).toBe('cd00001');
    });

    it('should convert pssmlength from string to number', async () => {
      const entry = buildCddEntry({ pssmlength: '512' });
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records[0]!.pssmLength).toBe(512);
    });

    it('should handle pssmlength as number', async () => {
      const entry = buildCddEntry({ pssmlength: 256 });
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records[0]!.pssmLength).toBe(256);
    });

    it('should convert numbersites from string to number', async () => {
      const entry = buildCddEntry({ numbersites: '5' });
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records[0]!.numberOfSites).toBe(5);
    });

    it('should handle numbersites as number', async () => {
      const entry = buildCddEntry({ numbersites: 12 });
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records[0]!.numberOfSites).toBe(12);
    });

    it('should map sitedescriptions with values', async () => {
      const entry = buildCddEntry({
        sitedescriptions: ['active site', 'binding site'],
      });
      mockFetchJson(buildSummaryResponse({ '223044': entry as Record<string, unknown> }));
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044']);

      expect(records[0]!.siteDescriptions).toEqual(['active site', 'binding site']);
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['223044', '999'],
          '223044': buildCddEntry(),
        },
      });
      const cdd = new Cdd();

      const records = await cdd.fetch(['223044', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('223044');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch records in one call', async () => {
      const entry = buildCddEntry();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              buildSummaryResponse({ '223044': entry as Record<string, unknown> }, ['223044']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const cdd = new Cdd();

      const records = await cdd.searchAndFetch('kinase');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('223044');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const cdd = new Cdd();

      const records = await cdd.searchAndFetch('nonexistent_domain_xyz');

      expect(records).toEqual([]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should pass retmax option to search', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSummaryResponse({}, [])),
        });
      vi.stubGlobal('fetch', fetchMock);
      const cdd = new Cdd();

      await cdd.searchAndFetch('kinase', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const cdd = new Cdd();

      await cdd.search('kinase');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const cdd = new Cdd({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await cdd.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
