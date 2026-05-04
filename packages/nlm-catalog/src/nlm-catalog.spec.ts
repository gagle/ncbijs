import { afterEach, describe, expect, it, vi } from 'vitest';
import { NlmCatalog } from './nlm-catalog';

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
      idlist: ['500045', '500046'],
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

function buildNlmCatalogEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '500045',
    nlmuniqueid: '9919229923206676',
    daterevised: '2026-04-10',
    titlemainlist: [
      { title: 'Discover genetics and evolution.', sorttitle: 'discover genetics and evolution' },
    ],
    titlemainsort: 'discover genetics and evolution',
    titleotherlist: [
      { titlealternate: 'Discover Genetics and Evolution' },
      { titlealternate: 'Current genetics' },
    ],
    issnlist: [
      { issn: '3091-3217', issntype: 'Electronic' },
      { issn: '3091-3217', issntype: 'Linking' },
    ],
    isbn: '',
    country: 'Germany',
    currentindexingstatus: 'Y',
    medlineta: 'Discov Genet Evol',
    isoabbreviation: '',
    startyear: '2026',
    endyear: '9999',
    jrid: '54852',
    language: 'eng',
    continuationnotes: 'Current genetics',
    resourceinfolist: [{ typeofresource: 'Serial' }],
    ...overrides,
  };
}

describe('NlmCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog();

      const result = await nlmCatalog.search('genetics');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['500045', '500046']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.search('molecular biology');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=nlmcatalog');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=molecular+biology');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.search('genetics', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.search('genetics');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog({ apiKey: 'test-key' });

      await nlmCatalog.search('genetics');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog({ tool: 'my-app', email: 'user@example.com' });

      await nlmCatalog.search('genetics');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const nlmCatalog = new NlmCatalog();

      const result = await nlmCatalog.search('genetics');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const nlmCatalog = new NlmCatalog();

      const result = await nlmCatalog.search('genetics');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch NLM Catalog records and map all fields', async () => {
      const entry = buildNlmCatalogEntry();
      mockFetchJson(buildSummaryResponse({ '500045': entry as Record<string, unknown> }));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
      expect(records[0]!.nlmUniqueId).toBe('9919229923206676');
      expect(records[0]!.dateRevised).toBe('2026-04-10');
      expect(records[0]!.titleSort).toBe('discover genetics and evolution');
      expect(records[0]!.isbn).toBe('');
      expect(records[0]!.country).toBe('Germany');
      expect(records[0]!.currentIndexingStatus).toBe('Y');
      expect(records[0]!.medlineAbbreviation).toBe('Discov Genet Evol');
      expect(records[0]!.isoAbbreviation).toBe('');
      expect(records[0]!.startYear).toBe('2026');
      expect(records[0]!.endYear).toBe('9999');
      expect(records[0]!.journalId).toBe('54852');
      expect(records[0]!.language).toBe('eng');
      expect(records[0]!.continuationNotes).toBe('Current genetics');
    });

    it('should extract title from first titlemainlist entry', async () => {
      const entry = buildNlmCatalogEntry();
      mockFetchJson(buildSummaryResponse({ '500045': entry as Record<string, unknown> }));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records[0]!.title).toBe('Discover genetics and evolution.');
    });

    it('should extract alternateTitles from titleotherlist', async () => {
      const entry = buildNlmCatalogEntry();
      mockFetchJson(buildSummaryResponse({ '500045': entry as Record<string, unknown> }));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records[0]!.alternateTitles).toEqual([
        'Discover Genetics and Evolution',
        'Current genetics',
      ]);
    });

    it('should map issns with issn and type', async () => {
      const entry = buildNlmCatalogEntry();
      mockFetchJson(buildSummaryResponse({ '500045': entry as Record<string, unknown> }));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records[0]!.issns).toHaveLength(2);
      expect(records[0]!.issns[0]!.issn).toBe('3091-3217');
      expect(records[0]!.issns[0]!.type).toBe('Electronic');
      expect(records[0]!.issns[1]!.issn).toBe('3091-3217');
      expect(records[0]!.issns[1]!.type).toBe('Linking');
    });

    it('should extract resourceType from first resourceinfolist entry', async () => {
      const entry = buildNlmCatalogEntry();
      mockFetchJson(buildSummaryResponse({ '500045': entry as Record<string, unknown> }));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records[0]!.resourceType).toBe('Serial');
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.fetch(['500045', '500046']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=nlmcatalog');
      expect(url).toContain('id=500045%2C500046');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildNlmCatalogEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '500045': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['500045', '999'],
        ),
      );
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045']);

      expect(records).toEqual([]);
    });

    it('should handle entry with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.nlmUniqueId).toBe('');
      expect(records[0]!.dateRevised).toBe('');
      expect(records[0]!.title).toBe('');
      expect(records[0]!.titleSort).toBe('');
      expect(records[0]!.alternateTitles).toEqual([]);
      expect(records[0]!.issns).toEqual([]);
      expect(records[0]!.isbn).toBe('');
      expect(records[0]!.country).toBe('');
      expect(records[0]!.currentIndexingStatus).toBe('');
      expect(records[0]!.medlineAbbreviation).toBe('');
      expect(records[0]!.isoAbbreviation).toBe('');
      expect(records[0]!.startYear).toBe('');
      expect(records[0]!.endYear).toBe('');
      expect(records[0]!.journalId).toBe('');
      expect(records[0]!.language).toBe('');
      expect(records[0]!.continuationNotes).toBe('');
      expect(records[0]!.resourceType).toBe('');
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { nlmuniqueid: '123456' } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.nlmUniqueId).toBe('123456');
    });

    it('should handle issns with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', issnlist: [{}] } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.issns[0]!.issn).toBe('');
      expect(records[0]!.issns[0]!.type).toBe('');
    });

    it('should handle titlemainlist entry with missing title field', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', titlemainlist: [{}] } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.title).toBe('');
    });

    it('should handle titleotherlist entry with missing titlealternate field', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', titleotherlist: [{}] } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.alternateTitles).toEqual(['']);
    });

    it('should handle empty resourceinfolist', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', resourceinfolist: [] } }, ['1']));
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['1']);

      expect(records[0]!.resourceType).toBe('');
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['500045', '999'],
          '500045': buildNlmCatalogEntry(),
        },
      });
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
    });

    it('should skip uid when entry is not a plain object', async () => {
      mockFetchJson({
        result: {
          uids: ['500045', '999'],
          '500045': buildNlmCatalogEntry(),
          '999': [1, 2, 3],
        },
      });
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
    });

    it('should skip uid when entry is null', async () => {
      mockFetchJson({
        result: {
          uids: ['500045', '999'],
          '500045': buildNlmCatalogEntry(),
          '999': null,
        },
      });
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.fetch(['500045', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch NLM Catalog records in one call', async () => {
      const entry = buildNlmCatalogEntry();
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
              buildSummaryResponse({ '500045': entry as Record<string, unknown> }, ['500045']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.searchAndFetch('genetics');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('500045');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const nlmCatalog = new NlmCatalog();

      const records = await nlmCatalog.searchAndFetch('nonexistent_journal_xyz');

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
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.searchAndFetch('genetics', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const nlmCatalog = new NlmCatalog();

      await nlmCatalog.search('genetics');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const nlmCatalog = new NlmCatalog({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await nlmCatalog.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
