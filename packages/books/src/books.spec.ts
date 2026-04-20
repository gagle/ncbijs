import { afterEach, describe, expect, it, vi } from 'vitest';
import { Books } from './books';

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
      idlist: ['5869272', '5869273'],
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

function buildBooksEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '5869272',
    title: 'Table 8. PLA2G6 Pathogenic Variants Referenced in This GeneReview',
    pubdate: '2008/06/19 00:00',
    id: 'gene/inad/table/inad.T.pla2g6_pathogenic_variants_refere/PMC',
    accessionid: 'NBK1675',
    parents: '',
    rtype: 'table',
    rid: 'NBK1675/table/inad.T.pla2g6_pathogenic_variants_refere',
    text: '',
    bookid: 1458984,
    bookaccessionid: 'NBK1116',
    chapterid: 1463034,
    chapteraccessionid: 'NBK1675',
    book: 'gene',
    navigation: 'yes',
    ...overrides,
  };
}

describe('Books', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books();

      const result = await books.search('GeneReviews');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['5869272', '5869273']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books();

      await books.search('PLA2G6 pathogenic variants');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=books');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=PLA2G6+pathogenic+variants');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books();

      await books.search('GeneReviews', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books();

      await books.search('GeneReviews');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books({ apiKey: 'test-key' });

      await books.search('GeneReviews');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books({ tool: 'my-app', email: 'user@example.com' });

      await books.search('GeneReviews');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const books = new Books();

      const result = await books.search('GeneReviews');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const books = new Books();

      const result = await books.search('GeneReviews');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch Books records and map all fields', async () => {
      const entry = buildBooksEntry();
      mockFetchJson(buildSummaryResponse({ '5869272': entry as Record<string, unknown> }));
      const books = new Books();

      const records = await books.fetch(['5869272']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
      expect(records[0]!.title).toBe(
        'Table 8. PLA2G6 Pathogenic Variants Referenced in This GeneReview',
      );
      expect(records[0]!.publicationDate).toBe('2008/06/19 00:00');
      expect(records[0]!.entryId).toBe(
        'gene/inad/table/inad.T.pla2g6_pathogenic_variants_refere/PMC',
      );
      expect(records[0]!.accessionId).toBe('NBK1675');
      expect(records[0]!.parents).toBe('');
      expect(records[0]!.resourceType).toBe('table');
      expect(records[0]!.resourceId).toBe('NBK1675/table/inad.T.pla2g6_pathogenic_variants_refere');
      expect(records[0]!.text).toBe('');
      expect(records[0]!.bookId).toBe(1458984);
      expect(records[0]!.bookAccessionId).toBe('NBK1116');
      expect(records[0]!.chapterId).toBe(1463034);
      expect(records[0]!.chapterAccessionId).toBe('NBK1675');
      expect(records[0]!.bookName).toBe('gene');
      expect(records[0]!.navigation).toBe('yes');
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const books = new Books();

      await books.fetch(['5869272', '5869273']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=books');
      expect(url).toContain('id=5869272%2C5869273');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const books = new Books();

      const records = await books.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildBooksEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '5869272': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['5869272', '999'],
        ),
      );
      const books = new Books();

      const records = await books.fetch(['5869272', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const books = new Books();

      const records = await books.fetch(['5869272']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const books = new Books();

      const records = await books.fetch(['5869272']);

      expect(records).toEqual([]);
    });

    it('should handle entry with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const books = new Books();

      const records = await books.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.title).toBe('');
      expect(records[0]!.publicationDate).toBe('');
      expect(records[0]!.entryId).toBe('');
      expect(records[0]!.accessionId).toBe('');
      expect(records[0]!.parents).toBe('');
      expect(records[0]!.resourceType).toBe('');
      expect(records[0]!.resourceId).toBe('');
      expect(records[0]!.text).toBe('');
      expect(records[0]!.bookId).toBe(0);
      expect(records[0]!.bookAccessionId).toBe('');
      expect(records[0]!.chapterId).toBe(0);
      expect(records[0]!.chapterAccessionId).toBe('');
      expect(records[0]!.bookName).toBe('');
      expect(records[0]!.navigation).toBe('');
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { title: 'Some Books entry' } }, ['1']));
      const books = new Books();

      const records = await books.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.title).toBe('Some Books entry');
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['5869272', '999'],
          '5869272': buildBooksEntry(),
        },
      });
      const books = new Books();

      const records = await books.fetch(['5869272', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
    });

    it('should skip uid when entry is not a plain object', async () => {
      mockFetchJson({
        result: {
          uids: ['5869272', '999'],
          '5869272': buildBooksEntry(),
          '999': [1, 2, 3],
        },
      });
      const books = new Books();

      const records = await books.fetch(['5869272', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
    });

    it('should skip uid when entry is null', async () => {
      mockFetchJson({
        result: {
          uids: ['5869272', '999'],
          '5869272': buildBooksEntry(),
          '999': null,
        },
      });
      const books = new Books();

      const records = await books.fetch(['5869272', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch Books records in one call', async () => {
      const entry = buildBooksEntry();
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
              buildSummaryResponse({ '5869272': entry as Record<string, unknown> }, ['5869272']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const books = new Books();

      const records = await books.searchAndFetch('GeneReviews');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('5869272');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const books = new Books();

      const records = await books.searchAndFetch('nonexistent_book_xyz');

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
      const books = new Books();

      await books.searchAndFetch('GeneReviews', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const books = new Books();

      await books.search('GeneReviews');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const books = new Books({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await books.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
