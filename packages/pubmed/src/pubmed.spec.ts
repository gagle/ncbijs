import { describe, it, expect, afterEach, vi } from 'vitest';
import { PubMed } from './pubmed';
import { PubMedQueryBuilder } from './query-builder';

const mockESearch = vi.fn();
const mockEFetch = vi.fn();
const mockELink = vi.fn();
const mockEPost = vi.fn();

vi.mock('@ncbijs/eutils', () => ({
  EUtils: vi.fn(function () {
    return {
      esearch: mockESearch,
      efetch: mockEFetch,
      elink: mockELink,
      epost: mockEPost,
    };
  }),
}));

const VALID_CONFIG = { tool: 'test-tool', email: 'test@example.com' };

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
        <ArticleId IdType="doi">10.1234/test</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

describe('PubMed', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const pubmed = new PubMed(VALID_CONFIG);
      expect(pubmed).toBeInstanceOf(PubMed);
    });

    it('should pass config to underlying EUtils', async () => {
      const { EUtils } = await import('@ncbijs/eutils');
      new PubMed(VALID_CONFIG);
      expect(EUtils).toHaveBeenCalledWith(VALID_CONFIG);
    });
  });

  describe('search', () => {
    it('should return PubMedQueryBuilder instance', () => {
      const pubmed = new PubMed(VALID_CONFIG);
      const builder = pubmed.search('cancer');
      expect(builder).toBeInstanceOf(PubMedQueryBuilder);
    });

    it('should set term on query builder', () => {
      const pubmed = new PubMed(VALID_CONFIG);
      const builder = pubmed.search('diabetes treatment');
      expect(builder.buildQuery()).toBe('diabetes treatment');
    });
  });

  describe('related', () => {
    it('should use ELink with neighbor_score command', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{ links: [] }] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      await pubmed.related('12345');

      expect(mockELink).toHaveBeenCalledWith({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '12345',
        cmd: 'neighbor_score',
      });
    });

    it('should return RelatedArticle array with relevancyScore', async () => {
      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [{ id: '12345', score: 95 }],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(SINGLE_ARTICLE_XML);

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('99999');

      expect(results).toHaveLength(1);
      expect(results[0]?.relevancyScore).toBe(95);
      expect(results[0]?.pmid).toBe('12345');
    });

    it('should fetch article details for related IDs', async () => {
      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [{ id: '12345', score: 90 }],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(SINGLE_ARTICLE_XML);

      const pubmed = new PubMed(VALID_CONFIG);
      await pubmed.related('99999');

      expect(mockEFetch).toHaveBeenCalledWith({
        db: 'pubmed',
        id: '12345',
        retmode: 'xml',
      });
    });

    it('should handle no related articles', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('12345');

      expect(results).toHaveLength(0);
    });

    it('should sort related articles by relevancy score descending', async () => {
      const twoArticleXml = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>11111</PMID>
      <Article>
        <ArticleTitle>Low Score</ArticleTitle>
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
        <ArticleTitle>High Score</ArticleTitle>
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

      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [
                  { id: '11111', score: 50 },
                  { id: '22222', score: 99 },
                ],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(twoArticleXml);

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('99999');

      expect(results).toHaveLength(2);
      expect(results[0]?.pmid).toBe('22222');
      expect(results[0]?.relevancyScore).toBe(99);
      expect(results[1]?.pmid).toBe('11111');
      expect(results[1]?.relevancyScore).toBe(50);
    });

    it('should default score to 0 when link has no score', async () => {
      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [{ id: '12345' }],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(SINGLE_ARTICLE_XML);

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('99999');

      expect(results).toHaveLength(1);
      expect(results[0]?.relevancyScore).toBe(0);
    });

    it('should return empty when linkSetDbs has empty links', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{ links: [] }] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('12345');

      expect(results).toHaveLength(0);
    });

    it('should return empty when linkSetDbs first entry has no links', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{}] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.related('12345');

      expect(results).toHaveLength(0);
    });
  });

  describe('citedBy', () => {
    it('should use ELink with pubmed_pubmed_citedin linkname', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{ links: [] }] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      await pubmed.citedBy('12345');

      expect(mockELink).toHaveBeenCalledWith({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '12345',
        linkname: 'pubmed_pubmed_citedin',
      });
    });

    it('should return Article array for citing articles', async () => {
      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [{ id: '12345' }],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(SINGLE_ARTICLE_XML);

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.citedBy('99999');

      expect(results).toHaveLength(1);
      expect(results[0]?.pmid).toBe('12345');
    });

    it('should handle article with no citations', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.citedBy('12345');

      expect(results).toHaveLength(0);
    });

    it('should return empty when linkSetDbs first entry has empty links', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{ links: [] }] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.citedBy('12345');

      expect(results).toHaveLength(0);
    });

    it('should return empty when linkSetDbs first entry has no links property', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{}] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.citedBy('12345');

      expect(results).toHaveLength(0);
    });
  });

  describe('references', () => {
    it('should use ELink with pubmed_pubmed_refs linkname', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [{ links: [] }] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      await pubmed.references('12345');

      expect(mockELink).toHaveBeenCalledWith({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '12345',
        linkname: 'pubmed_pubmed_refs',
      });
    });

    it('should return Article array for referenced articles', async () => {
      mockELink.mockResolvedValue({
        linkSets: [
          {
            linkSetDbs: [
              {
                links: [{ id: '12345' }],
              },
            ],
          },
        ],
      });
      mockEFetch.mockResolvedValue(SINGLE_ARTICLE_XML);

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.references('99999');

      expect(results).toHaveLength(1);
      expect(results[0]?.pmid).toBe('12345');
    });

    it('should handle article with no references', async () => {
      mockELink.mockResolvedValue({
        linkSets: [{ linkSetDbs: [] }],
      });

      const pubmed = new PubMed(VALID_CONFIG);
      const results = await pubmed.references('12345');

      expect(results).toHaveLength(0);
    });
  });
});
