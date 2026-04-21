import { describe, it, expect, afterEach, vi } from 'vitest';
import { PubMedQueryBuilder } from './query-builder';

const SINGLE_ARTICLE_XML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345</PMID>
      <Article>
        <ArticleTitle>Test Article</ArticleTitle>
        <Abstract><AbstractText>Abstract text.</AbstractText></Abstract>
        <AuthorList><Author><LastName>Smith</LastName><ForeName>John</ForeName></Author></AuthorList>
        <Journal>
          <Title>Nature</Title>
          <ISOAbbreviation>Nature</ISOAbbreviation>
          <JournalIssue><Volume>100</Volume><Issue>1</Issue><PubDate><Year>2024</Year></PubDate></JournalIssue>
        </Journal>
        <PublicationTypeList><PublicationType>Journal Article</PublicationType></PublicationTypeList>
        <GrantList></GrantList>
        <Language>eng</Language>
      </Article>
      <MeshHeadingList></MeshHeadingList>
      <KeywordList></KeywordList>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">12345</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

function createMockEUtils(
  overrides: Record<string, unknown> = {},
): Record<string, ReturnType<typeof vi.fn>> {
  return {
    esearch: vi.fn().mockResolvedValue({
      count: 0,
      idList: [],
      retMax: 0,
      retStart: 0,
      translationSet: [],
      queryTranslation: '',
      webEnv: 'WEBENV_123',
      queryKey: 1,
    }),
    efetch: vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML),
    elink: vi.fn(),
    epost: vi.fn(),
    ...overrides,
  };
}

describe('PubMedQueryBuilder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('query construction', () => {
    it('should start with base term', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      expect(builder.buildQuery()).toBe('cancer');
    });

    it('should append author filter with [au] tag', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.author('Smith J');
      expect(builder.buildQuery()).toBe('cancer AND Smith J[au]');
    });

    it('should append journal filter with [ta] tag', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.journal('Nature');
      expect(builder.buildQuery()).toBe('cancer AND "Nature"[ta]');
    });

    it('should append MeSH term with [mesh] tag', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'treatment');
      builder.meshTerm('Neoplasms');
      expect(builder.buildQuery()).toBe('treatment AND "Neoplasms"[mesh]');
    });

    it('should append date range with [dp] tag', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.dateRange('2020/01/01', '2024/12/31');
      expect(builder.buildQuery()).toBe('cancer AND ("2020/01/01"[dp] : "2024/12/31"[dp])');
    });

    it('should append publication type filter', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.publicationType('Review');
      expect(builder.buildQuery()).toBe('cancer AND "Review"[pt]');
    });

    it('should append free full text filter', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.freeFullText();
      expect(builder.buildQuery()).toBe('cancer AND free full text[sb]');
    });

    it('should set sort field', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.sort('pub_date');

      // sort is applied at search time, not in query string
      expect(builder.buildQuery()).toBe('cancer');
    });

    it('should construct proximity search', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.proximity('breast cancer', 'tiab', 5);
      expect(builder.buildQuery()).toBe('cancer AND "breast cancer"[tiab:~5]');
    });

    it('should set result limit', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.limit(100);

      // limit is applied at fetch time, not in query string
      expect(builder.buildQuery()).toBe('cancer');
    });

    it('should chain multiple filters', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.author('Smith J').journal('Nature');
      expect(builder.buildQuery()).toBe('cancer AND Smith J[au] AND "Nature"[ta]');
    });

    it('should combine all filter types in correct order', () => {
      const mockEUtils = createMockEUtils();
      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder
        .author('Smith J')
        .journal('Nature')
        .meshTerm('Neoplasms')
        .dateRange('2020', '2024')
        .publicationType('Review')
        .freeFullText();

      expect(builder.buildQuery()).toBe(
        'cancer AND Smith J[au] AND "Nature"[ta] AND "Neoplasms"[mesh] AND ("2020"[dp] : "2024"[dp]) AND "Review"[pt] AND free full text[sb]',
      );
    });
  });

  describe('fetchAll', () => {
    it('should call ESearch then EFetch with History Server', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 1,
        idList: ['12345'],
        retMax: 1,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      await builder.fetchAll();

      expect(esearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          db: 'pubmed',
          term: 'cancer',
          usehistory: 'y',
          retmax: 0,
        }),
      );
      expect(efetchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          db: 'pubmed',
          WebEnv: 'WEBENV_123',
          query_key: 1,
          retmode: 'xml',
        }),
      );
    });

    it('should parse XML response into Article array', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 1,
        idList: ['12345'],
        retMax: 1,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const results = await builder.fetchAll();

      expect(results).toHaveLength(1);
      expect(results[0]?.pmid).toBe('12345');
      expect(results[0]?.title).toBe('Test Article');
    });

    it('should handle empty search results', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 0,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: '',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'xyznonexistent');
      const results = await builder.fetchAll();

      expect(results).toHaveLength(0);
    });

    it('should use date segmentation for results exceeding 10K', async () => {
      const esearchMock = vi
        .fn()
        .mockResolvedValueOnce({
          count: 15000,
          idList: [],
          retMax: 0,
          retStart: 0,
          translationSet: [],
          queryTranslation: 'cancer',
          webEnv: 'WEBENV_MAIN',
          queryKey: 1,
        })
        .mockResolvedValue({
          count: 0,
          idList: [],
          retMax: 0,
          retStart: 0,
          translationSet: [],
          queryTranslation: '',
          webEnv: 'WEBENV_YEAR',
          queryKey: 2,
        });
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const results = await builder.fetchAll();

      // First call is the main search, subsequent are year-segmented
      expect(esearchMock.mock.calls.length).toBeGreaterThan(1);
      // With 0-count year searches, results are empty
      expect(results).toHaveLength(0);
    });

    it('should respect result limit', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 500,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.limit(1);
      const results = await builder.fetchAll();

      expect(efetchMock).toHaveBeenCalledWith(expect.objectContaining({ retmax: 1 }));
      expect(results).toHaveLength(1);
    });

    it('should propagate eutils errors', async () => {
      const esearchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      await expect(builder.fetchAll()).rejects.toThrow('Network error');
    });
  });

  describe('batches', () => {
    it('should yield ReadonlyArray<Article> per batch', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 1,
        idList: ['12345'],
        retMax: 1,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(10)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(1);
    });

    it('should use specified batch size', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 2,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(1)) {
        batches.push(batch);
      }

      expect(efetchMock).toHaveBeenCalledWith(expect.objectContaining({ retmax: 1 }));
    });

    it('should iterate until all results consumed', async () => {
      const twoArticleXml = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>11111</PMID>
      <Article>
        <ArticleTitle>Article One</ArticleTitle>
        <Abstract><AbstractText>Abstract.</AbstractText></Abstract>
        <AuthorList><Author><LastName>A</LastName></Author></AuthorList>
        <Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>
        <PublicationTypeList><PublicationType>Journal Article</PublicationType></PublicationTypeList>
        <Language>eng</Language>
      </Article>
      <MeshHeadingList></MeshHeadingList>
      <KeywordList></KeywordList>
    </MedlineCitation>
    <PubmedData><ArticleIdList><ArticleId IdType="pubmed">11111</ArticleId></ArticleIdList></PubmedData>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>22222</PMID>
      <Article>
        <ArticleTitle>Article Two</ArticleTitle>
        <Abstract><AbstractText>Abstract.</AbstractText></Abstract>
        <AuthorList><Author><LastName>B</LastName></Author></AuthorList>
        <Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>
        <PublicationTypeList><PublicationType>Journal Article</PublicationType></PublicationTypeList>
        <Language>eng</Language>
      </Article>
      <MeshHeadingList></MeshHeadingList>
      <KeywordList></KeywordList>
    </MedlineCitation>
    <PubmedData><ArticleIdList><ArticleId IdType="pubmed">22222</ArticleId></ArticleIdList></PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

      const esearchMock = vi.fn().mockResolvedValue({
        count: 2,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(twoArticleXml);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const allArticles: Array<unknown> = [];

      for await (const batch of builder.batches(10)) {
        allArticles.push(...batch);
      }

      expect(allArticles).toHaveLength(2);
    });

    it('should handle single batch result', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 1,
        idList: ['12345'],
        retMax: 1,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'test',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'test');
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(500)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
    });

    it('should handle empty result set', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 0,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: '',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'xyznonexistent');
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(10)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(0);
    });

    it('should throw when results exceed 10K', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 15000,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _batch of builder.batches(10)) {
          // noop
        }
      }).rejects.toThrow('exceeding the 10000 limit');
    });

    it('should respect limit when used with batches', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 500,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.limit(1);
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(10)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
    });

    it('should stop when efetch returns empty articles', async () => {
      const emptyXml = '<?xml version="1.0"?><PubmedArticleSet></PubmedArticleSet>';
      const esearchMock = vi.fn().mockResolvedValue({
        count: 5,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(emptyXml);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const batches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of builder.batches(10)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(0);
    });
  });

  describe('fetchFromHistory edge cases', () => {
    it('should stop when fetchFromHistory receives empty XML batch', async () => {
      const emptyXml = '<?xml version="1.0"?><PubmedArticleSet></PubmedArticleSet>';
      const esearchMock = vi.fn().mockResolvedValue({
        count: 5,
        idList: [],
        retMax: 0,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
        webEnv: 'WEBENV_123',
        queryKey: 1,
      });
      const efetchMock = vi.fn().mockResolvedValue(emptyXml);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const results = await builder.fetchAll();

      expect(results).toHaveLength(0);
    });
  });

  describe('extractHistoryParams', () => {
    it('should throw when ESearch does not return History Server params', async () => {
      const esearchMock = vi.fn().mockResolvedValue({
        count: 1,
        idList: ['12345'],
        retMax: 1,
        retStart: 0,
        translationSet: [],
        queryTranslation: 'cancer',
      });
      const mockEUtils = createMockEUtils({ esearch: esearchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      await expect(builder.fetchAll()).rejects.toThrow('History Server parameters');
    });
  });

  describe('fetchWithDateSegmentation', () => {
    it('should collect articles from year-segmented searches', async () => {
      const currentYear = new Date().getFullYear();
      const esearchMock = vi
        .fn()
        .mockResolvedValueOnce({
          count: 15000,
          idList: [],
          retMax: 0,
          retStart: 0,
          translationSet: [],
          queryTranslation: 'cancer',
          webEnv: 'WEBENV_MAIN',
          queryKey: 1,
        })
        .mockImplementation((params: Record<string, unknown>) => {
          const term = params['term'] as string;
          if (term.includes(`${currentYear}/01/01`)) {
            return Promise.resolve({
              count: 1,
              idList: [],
              retMax: 0,
              retStart: 0,
              translationSet: [],
              queryTranslation: '',
              webEnv: 'WEBENV_YEAR',
              queryKey: 2,
            });
          }
          return Promise.resolve({
            count: 0,
            idList: [],
            retMax: 0,
            retStart: 0,
            translationSet: [],
            queryTranslation: '',
            webEnv: 'WEBENV_EMPTY',
            queryKey: 3,
          });
        });
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      const results = await builder.fetchAll();

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]?.pmid).toBe('12345');
    });

    it('should stop date segmentation when enough articles are collected', async () => {
      const currentYear = new Date().getFullYear();
      const esearchMock = vi
        .fn()
        .mockResolvedValueOnce({
          count: 15000,
          idList: [],
          retMax: 0,
          retStart: 0,
          translationSet: [],
          queryTranslation: 'cancer',
          webEnv: 'WEBENV_MAIN',
          queryKey: 1,
        })
        .mockImplementation(() =>
          Promise.resolve({
            count: 1,
            idList: [],
            retMax: 0,
            retStart: 0,
            translationSet: [],
            queryTranslation: '',
            webEnv: 'WEBENV_YEAR',
            queryKey: 2,
          }),
        );
      const efetchMock = vi.fn().mockResolvedValue(SINGLE_ARTICLE_XML);
      const mockEUtils = createMockEUtils({ esearch: esearchMock, efetch: efetchMock });

      const builder = new PubMedQueryBuilder(mockEUtils as never, 'cancer');
      builder.limit(1);
      const results = await builder.fetchAll();

      expect(results).toHaveLength(1);
      const yearSearches = esearchMock.mock.calls.filter((call: Array<Record<string, unknown>>) => {
        const term = call[0]?.['term'] as string;
        return term.includes('[dp]');
      });
      expect(yearSearches.length).toBeLessThan(currentYear - 1900);
    });
  });
});
