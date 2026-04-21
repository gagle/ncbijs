import { describe, it, expect, afterEach, vi } from 'vitest';
import { PMC, pmcToMarkdown, pmcToPlainText, pmcToChunks } from './pmc';
import type { FullTextArticle, OARecord } from './interfaces/pmc.interface';

const mockEFetch = vi.fn();
const mockESearch = vi.fn();

vi.mock('@ncbijs/eutils', () => ({
  EUtils: vi.fn(function () {
    return { efetch: mockEFetch, esearch: mockESearch };
  }),
}));

const VALID_CONFIG = { tool: 'test-tool', email: 'test@example.com' };

const JATS_XML = `<?xml version="1.0"?>
<article>
  <front>
    <journal-meta>
      <journal-title>Test Journal</journal-title>
    </journal-meta>
    <article-meta>
      <title-group><article-title>Test Article</article-title></title-group>
      <contrib-group>
        <contrib contrib-type="author"><name><surname>Smith</surname><given-names>John</given-names></name></contrib>
      </contrib-group>
    </article-meta>
    <permissions>
      <license license-type="open-access">
        <license-p>This is open access.</license-p>
      </license>
    </permissions>
  </front>
  <body>
    <sec><title>Introduction</title><p>Hello world.</p></sec>
  </body>
  <back>
    <ref-list></ref-list>
  </back>
</article>`;

function buildFullTextArticle(overrides: Partial<FullTextArticle> = {}): FullTextArticle {
  return {
    pmcid: 'PMC12345',
    front: {
      journal: { title: 'Test Journal' },
      article: {
        title: 'Test Article',
        authors: [{ lastName: 'Smith', foreName: 'John', affiliations: [] }],
      },
    },
    body: [
      {
        title: 'Introduction',
        depth: 1,
        paragraphs: ['Hello world.'],
        tables: [],
        figures: [],
        subsections: [],
      },
    ],
    back: { references: [] },
    license: 'open-access',
    ...overrides,
  };
}

const S3_METADATA_RESPONSE = {
  pmcid: 'PMC12345',
  version: 1,
  pmid: 12345678,
  doi: '10.1234/test.2024',
  mid: null,
  title: 'Test Article Title',
  citation: 'Smith J. Test. 2024.',
  is_pmc_openaccess: true,
  is_manuscript: false,
  is_historical_ocr: false,
  is_retracted: false,
  license_code: 'CC BY',
  xml_url: 's3://pmc-oa-opendata/PMC12345.1/PMC12345.1.xml?md5=abc123',
  text_url: 's3://pmc-oa-opendata/PMC12345.1/PMC12345.1.txt?md5=def456',
  pdf_url: 's3://pmc-oa-opendata/PMC12345.1/PMC12345.1.pdf?md5=ghi789',
  media_urls: ['s3://pmc-oa-opendata/PMC12345.1/figure1.jpg?md5=jkl012'],
};

const S3_MANUSCRIPT_RESPONSE = {
  pmcid: 'PMC99999',
  version: 1,
  pmid: 99999999,
  doi: '10.1234/manuscript.2024',
  mid: 'NIHMS1234567',
  title: 'Manuscript Title',
  citation: 'Author manuscript; Available in PMC 2024.',
  is_pmc_openaccess: false,
  is_manuscript: true,
  is_historical_ocr: false,
  is_retracted: false,
  license_code: 'TDM',
  xml_url: 's3://pmc-oa-opendata/PMC99999.1/PMC99999.1.xml?md5=aaa',
  text_url: 's3://pmc-oa-opendata/PMC99999.1/PMC99999.1.txt?md5=bbb',
};

function mockFetchJson(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }),
  );
}

function mockFetchText(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

const OAI_LIST_RESPONSE = `<?xml version="1.0"?>
<OAI-PMH>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:pubmedcentral.nih.gov:12345</identifier>
        <datestamp>2024-01-01</datestamp>
        <setSpec>pmc-open</setSpec>
      </header>
      <metadata><article>Full JATS XML here</article></metadata>
    </record>
  </ListRecords>
</OAI-PMH>`;

const OAI_LIST_WITH_RESUMPTION = `<?xml version="1.0"?>
<OAI-PMH>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:pubmedcentral.nih.gov:11111</identifier>
        <datestamp>2024-01-01</datestamp>
        <setSpec>pmc-open</setSpec>
      </header>
      <metadata><article>Article 1</article></metadata>
    </record>
    <resumptionToken>token123</resumptionToken>
  </ListRecords>
</OAI-PMH>`;

const OAI_LIST_FINAL_PAGE = `<?xml version="1.0"?>
<OAI-PMH>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:pubmedcentral.nih.gov:22222</identifier>
        <datestamp>2024-02-01</datestamp>
        <setSpec>pmc-open</setSpec>
      </header>
      <metadata><article>Article 2</article></metadata>
    </record>
  </ListRecords>
</OAI-PMH>`;

const OAI_GET_RECORD_RESPONSE = `<?xml version="1.0"?>
<OAI-PMH>
  <GetRecord>
    <record>
      <header>
        <identifier>oai:pubmedcentral.nih.gov:12345</identifier>
        <datestamp>2024-01-01</datestamp>
        <setSpec>pmc-open</setSpec>
      </header>
      <metadata><article>Full JATS XML</article></metadata>
    </record>
  </GetRecord>
</OAI-PMH>`;

const OAI_ERROR_RESPONSE = `<?xml version="1.0"?>
<OAI-PMH>
  <error code="idDoesNotExist">No matching identifier</error>
</OAI-PMH>`;

describe('PMC', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const pmc = new PMC(VALID_CONFIG);
      expect(pmc).toBeInstanceOf(PMC);
    });

    it('should accept optional apiKey', () => {
      const pmc = new PMC({ ...VALID_CONFIG, apiKey: 'test-key' });
      expect(pmc).toBeInstanceOf(PMC);
    });

    it('should accept optional maxRetries', () => {
      const pmc = new PMC({ ...VALID_CONFIG, maxRetries: 5 });
      expect(pmc).toBeInstanceOf(PMC);
    });
  });

  describe('fetch', () => {
    it('should fetch article by PMCID via E-utilities', async () => {
      mockEFetch.mockResolvedValue(JATS_XML);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.fetch('PMC12345');

      expect(mockEFetch).toHaveBeenCalledWith({
        db: 'pmc',
        id: 'PMC12345',
        retmode: 'xml',
      });
    });

    it('should parse JATS XML into FullTextArticle', async () => {
      mockEFetch.mockResolvedValue(JATS_XML);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.front.article.title).toBe('Test Article');
      expect(article.body).toHaveLength(1);
      expect(article.body[0]?.title).toBe('Introduction');
    });

    it('should extract pmcid, front, body, back, license', async () => {
      mockEFetch.mockResolvedValue(JATS_XML);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.pmcid).toBe('PMC12345');
      expect(article.front).toBeDefined();
      expect(article.body).toBeDefined();
      expect(article.back).toBeDefined();
      expect(article.license).toBe('open-access');
    });

    it('should normalize PMCID with or without PMC prefix', async () => {
      mockEFetch.mockResolvedValue(JATS_XML);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.fetch('12345');

      expect(mockEFetch).toHaveBeenCalledWith(expect.objectContaining({ id: 'PMC12345' }));
    });

    it('should throw on non-existent PMCID', async () => {
      mockEFetch.mockResolvedValue('');
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.fetch('PMC99999')).rejects.toThrow('No content returned');
    });

    it('should throw on article without full text', async () => {
      mockEFetch.mockResolvedValue('<html><body>No full text available</body></html>');
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.fetch('PMC99999')).rejects.toThrow();
    });

    it('should extract license from license-p when license-type attribute is missing', async () => {
      const xmlWithLicenseP = JATS_XML.replace(
        '<license license-type="open-access">\n        <license-p>This is open access.</license-p>\n      </license>',
        '<license>\n        <license-p>Creative Commons <a>CC BY 4.0</a> license</license-p>\n      </license>',
      );
      mockEFetch.mockResolvedValue(xmlWithLicenseP);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.license).toContain('Creative Commons');
      expect(article.license).toContain('CC BY 4.0');
    });

    it('should extract license from p tag when license-p is missing', async () => {
      const xmlWithP = JATS_XML.replace(
        '<license license-type="open-access">\n        <license-p>This is open access.</license-p>\n      </license>',
        '<license>\n        <p>Free to use under <a>MIT</a></p>\n      </license>',
      );
      mockEFetch.mockResolvedValue(xmlWithP);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.license).toContain('Free to use under');
      expect(article.license).toContain('MIT');
    });

    it('should extract license from raw block text when no nested elements match', async () => {
      const xmlRawLicense = JATS_XML.replace(
        '<license license-type="open-access">\n        <license-p>This is open access.</license-p>\n      </license>',
        '<license>Raw license text here</license>',
      );
      mockEFetch.mockResolvedValue(xmlRawLicense);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.license).toBe('Raw license text here');
    });

    it('should return empty license when no license block exists', async () => {
      const xmlNoLicense = JATS_XML.replace(
        '<permissions>\n      <license license-type="open-access">\n        <license-p>This is open access.</license-p>\n      </license>\n    </permissions>',
        '<permissions></permissions>',
      );
      mockEFetch.mockResolvedValue(xmlNoLicense);
      const pmc = new PMC(VALID_CONFIG);
      const article = await pmc.fetch('PMC12345');

      expect(article.license).toBe('');
    });
  });

  describe('oa.lookup', () => {
    it('should fetch OA record from S3 metadata', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.pmcid).toBe('PMC12345');
    });

    it('should request version 1 by default', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oa.lookup('PMC12345');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('/metadata/PMC12345.1.json');
    });

    it('should support custom version via options', async () => {
      mockFetchJson({ ...S3_METADATA_RESPONSE, version: 2 });
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oa.lookup('PMC12345', { version: 2 });

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('/metadata/PMC12345.2.json');
    });

    it('should parse citation and license', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.citation).toBe('Smith J. Test. 2024.');
      expect(record.license).toBe('CC BY');
    });

    it('should parse retracted flag', async () => {
      mockFetchJson({ ...S3_METADATA_RESPONSE, is_retracted: true });
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.retracted).toBe(true);
    });

    it('should parse pmid, doi, and version', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.pmid).toBe(12345678);
      expect(record.doi).toBe('10.1234/test.2024');
      expect(record.version).toBe(1);
    });

    it('should parse openAccess, manuscript, and historicalOcr flags', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.openAccess).toBe(true);
      expect(record.manuscript).toBe(false);
      expect(record.historicalOcr).toBe(false);
    });

    it('should convert S3 URLs to HTTPS', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.xmlUrl).toBe(
        'https://pmc-oa-opendata.s3.amazonaws.com/PMC12345.1/PMC12345.1.xml',
      );
      expect(record.textUrl).toBe(
        'https://pmc-oa-opendata.s3.amazonaws.com/PMC12345.1/PMC12345.1.txt',
      );
      expect(record.pdfUrl).toBe(
        'https://pmc-oa-opendata.s3.amazonaws.com/PMC12345.1/PMC12345.1.pdf',
      );
    });

    it('should convert media S3 URLs to HTTPS', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.mediaUrls).toHaveLength(1);
      expect(record.mediaUrls?.[0]).toBe(
        'https://pmc-oa-opendata.s3.amazonaws.com/PMC12345.1/figure1.jpg',
      );
    });

    it('should omit pdfUrl when not present in metadata', async () => {
      mockFetchJson(S3_MANUSCRIPT_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC99999');

      expect(record.pdfUrl).toBeUndefined();
    });

    it('should omit mediaUrls when not present in metadata', async () => {
      mockFetchJson(S3_MANUSCRIPT_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC99999');

      expect(record.mediaUrls).toBeUndefined();
    });

    it('should handle manuscript records with mid', async () => {
      mockFetchJson(S3_MANUSCRIPT_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC99999');

      expect(record.mid).toBe('NIHMS1234567');
      expect(record.manuscript).toBe(true);
      expect(record.openAccess).toBe(false);
      expect(record.license).toBe('TDM');
    });

    it('should handle null license_code as undefined', async () => {
      mockFetchJson({ ...S3_METADATA_RESPONSE, license_code: null });
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.license).toBeUndefined();
    });

    it('should handle null mid as undefined', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.mid).toBeUndefined();
    });

    it('should handle null pmid and doi as undefined', async () => {
      mockFetchJson({ ...S3_METADATA_RESPONSE, pmid: null, doi: null });
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.pmid).toBeUndefined();
      expect(record.doi).toBeUndefined();
    });

    it('should handle S3 URLs without query strings', async () => {
      mockFetchJson({
        ...S3_METADATA_RESPONSE,
        xml_url: 's3://pmc-oa-opendata/PMC12345.1/PMC12345.1.xml',
        text_url: 's3://pmc-oa-opendata/PMC12345.1/PMC12345.1.txt',
      });
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.xmlUrl).toBe(
        'https://pmc-oa-opendata.s3.amazonaws.com/PMC12345.1/PMC12345.1.xml',
      );
    });

    it('should throw on non-existent article', async () => {
      mockFetchJson({}, 404);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oa.lookup('PMC99999')).rejects.toThrow('No OA record found');
    });

    it('should throw on S3 403 forbidden', async () => {
      mockFetchJson({}, 403);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oa.lookup('PMC99999')).rejects.toThrow('No OA record found');
    });

    it('should throw on non-403/404 HTTP error', async () => {
      mockFetchJson({}, 500);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oa.lookup('PMC12345')).rejects.toThrow(
        'OA lookup failed for PMC12345: HTTP 500',
      );
    });

    it('should throw on malformed JSON response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        }),
      );
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oa.lookup('PMC12345')).rejects.toThrow(
        'OA lookup returned malformed response',
      );
    });

    it('should normalize PMCID without prefix', async () => {
      mockFetchJson(S3_METADATA_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oa.lookup('12345');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('/metadata/PMC12345.1.json');
    });
  });

  describe('oa.since', () => {
    it('should yield OARecords since given date via eSearch + S3', async () => {
      mockESearch.mockResolvedValue({ count: 1, idList: ['12345'] });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(S3_METADATA_RESPONSE),
        }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      expect(records[0]?.pmcid).toBe('PMC12345');
    });

    it('should use eSearch with date range and OA filter', async () => {
      mockESearch.mockResolvedValue({ count: 0, idList: [] });

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(mockESearch).toHaveBeenCalledWith(
        expect.objectContaining({
          db: 'pmc',
          term: expect.stringContaining('2024-01-01'),
        }),
      );
      expect(mockESearch.mock.calls[0]?.[0].term).toContain('open_access[filter]');
      expect(mockESearch.mock.calls[0]?.[0].term).toContain('author_manuscript[filter]');
    });

    it('should support until option', async () => {
      mockESearch.mockResolvedValue({ count: 0, idList: [] });

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01', { until: '2024-06-30' })) {
        records.push(record);
      }

      expect(mockESearch.mock.calls[0]?.[0].term).toContain('2024-01-01:2024-06-30[pmcrdat]');
    });

    it('should fetch S3 metadata for all eSearch results', async () => {
      mockESearch.mockResolvedValue({ count: 2, idList: ['11111', '22222'] });

      const metadata11111 = { ...S3_METADATA_RESPONSE, pmcid: 'PMC11111' };
      const metadata22222 = { ...S3_METADATA_RESPONSE, pmcid: 'PMC22222' };

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(metadata11111),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(metadata22222),
          }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(2);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('should skip articles that fail S3 fetch', async () => {
      mockESearch.mockResolvedValue({ count: 2, idList: ['11111', '22222'] });

      const successMetadata = { ...S3_METADATA_RESPONSE, pmcid: 'PMC22222' };
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({}) })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(successMetadata),
          }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      expect(records[0]?.pmcid).toBe('PMC22222');
    });

    it('should handle empty result set', async () => {
      mockESearch.mockResolvedValue({ count: 0, idList: [] });

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2099-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(0);
    });

    it('should skip articles with malformed JSON from S3', async () => {
      mockESearch.mockResolvedValue({ count: 2, idList: ['11111', '22222'] });

      const successMetadata = { ...S3_METADATA_RESPONSE, pmcid: 'PMC22222' };
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.reject(new SyntaxError('bad json')),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(successMetadata),
          }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      expect(records[0]?.pmcid).toBe('PMC22222');
    });

    it('should handle PMC-prefixed IDs from eSearch', async () => {
      mockESearch.mockResolvedValue({ count: 1, idList: ['PMC12345'] });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(S3_METADATA_RESPONSE),
        }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('/metadata/PMC12345.1.json');
    });

    it('should paginate through multiple eSearch batches', async () => {
      mockESearch
        .mockResolvedValueOnce({ count: 501, idList: ['11111'] })
        .mockResolvedValueOnce({ count: 501, idList: [] });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ...S3_METADATA_RESPONSE, pmcid: 'PMC11111' }),
        }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<OARecord> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      expect(mockESearch).toHaveBeenCalledTimes(2);
    });
  });

  describe('oai.listRecords', () => {
    it('should yield OAIRecords with identifier and metadata', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
    });

    it('should support from option', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('from=2024-01-01');
    });

    it('should support until option', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ from: '2024-01-01', until: '2024-12-31' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('until=2024-12-31');
    });

    it('should support set option', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ set: 'pmc-open' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('set=pmc-open');
    });

    it('should handle records with missing header and metadata blocks', async () => {
      mockFetchText(`<?xml version="1.0"?>
<OAI-PMH>
  <ListRecords>
    <record>
      <someOther>content</someOther>
    </record>
  </ListRecords>
</OAI-PMH>`);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
      const oaiRecord = records[0] as {
        identifier: string;
        datestamp: string;
        setSpec: string;
        metadata: string;
      };
      expect(oaiRecord.identifier).toBe('');
      expect(oaiRecord.datestamp).toBe('');
      expect(oaiRecord.setSpec).toBe('');
      expect(oaiRecord.metadata).toBe('');
    });

    it('should support metadataPrefix option', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ metadataPrefix: 'oai_dc' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('metadataPrefix=oai_dc');
    });

    it('should paginate with resumptionToken', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve(OAI_LIST_WITH_RESUMPTION),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve(OAI_LIST_FINAL_PAGE),
          }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(2);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('should stop when no more results', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should use correct OAI-PMH URL', async () => {
      mockFetchText(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('https://www.ncbi.nlm.nih.gov/pmc/oai/oai.cgi');
      expect(url).toContain('verb=ListRecords');
    });

    it('should handle empty result set', async () => {
      mockFetchText(`<?xml version="1.0"?>
<OAI-PMH>
  <error code="noRecordsMatch">No records match the request</error>
</OAI-PMH>`);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2099-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(0);
    });

    it('should throw on HTTP error response', async () => {
      mockFetchText('Server Error', 500);
      const pmc = new PMC(VALID_CONFIG);

      await expect(async () => {
        const records = [];
        for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
          records.push(record);
        }
      }).rejects.toThrow('OAI-PMH ListRecords failed: HTTP 500');
    });

    it('should stop when response has no ListRecords block', async () => {
      mockFetchText(`<?xml version="1.0"?>
<OAI-PMH>
  <responseDate>2024-01-01T00:00:00Z</responseDate>
</OAI-PMH>`);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(0);
    });
  });

  describe('oai.getRecord', () => {
    it('should fetch single OAI record by PMCID', async () => {
      mockFetchText(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oai.getRecord('PMC12345');

      expect(record.identifier).toBe('oai:pubmedcentral.nih.gov:12345');
    });

    it('should return identifier, datestamp, setSpec, metadata', async () => {
      mockFetchText(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oai.getRecord('PMC12345');

      expect(record.identifier).toBe('oai:pubmedcentral.nih.gov:12345');
      expect(record.datestamp).toBe('2024-01-01');
      expect(record.setSpec).toBe('pmc-open');
      expect(record.metadata).toContain('Full JATS XML');
    });

    it('should support custom metadataPrefix', async () => {
      mockFetchText(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oai.getRecord('PMC12345', 'oai_dc');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('metadataPrefix=oai_dc');
    });

    it('should throw on non-existent record', async () => {
      mockFetchText(OAI_ERROR_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oai.getRecord('PMC99999')).rejects.toThrow('OAI-PMH error');
    });

    it('should throw on HTTP error response', async () => {
      mockFetchText('Server Error', 500);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oai.getRecord('PMC12345')).rejects.toThrow(
        'OAI-PMH GetRecord failed for PMC12345: HTTP 500',
      );
    });

    it('should throw when GetRecord block is missing from response', async () => {
      mockFetchText(`<?xml version="1.0"?>
<OAI-PMH>
  <responseDate>2024-01-01T00:00:00Z</responseDate>
</OAI-PMH>`);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oai.getRecord('PMC12345')).rejects.toThrow('No record found for PMC12345');
    });

    it('should throw when record block is missing inside GetRecord', async () => {
      mockFetchText(`<?xml version="1.0"?>
<OAI-PMH>
  <GetRecord>
    <someOtherElement>data</someOtherElement>
  </GetRecord>
</OAI-PMH>`);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oai.getRecord('PMC12345')).rejects.toThrow('No record found for PMC12345');
    });

    it('should strip PMC prefix when constructing OAI identifier', async () => {
      mockFetchText(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oai.getRecord('PMC12345');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('identifier=oai%3Apubmedcentral.nih.gov%3A12345');
    });

    it('should handle numeric-only PMCID', async () => {
      mockFetchText(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oai.getRecord('12345');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('identifier=oai%3Apubmedcentral.nih.gov%3A12345');
    });
  });
});

describe('pmcToMarkdown', () => {
  it('should convert FullTextArticle to markdown', () => {
    const article = buildFullTextArticle();
    const markdown = pmcToMarkdown(article);

    expect(markdown).toContain('# Test Article');
    expect(markdown).toContain('## Introduction');
    expect(markdown).toContain('Hello world.');
  });

  it('should delegate to jats toMarkdown internally', () => {
    const article = buildFullTextArticle();
    const markdown = pmcToMarkdown(article);

    expect(typeof markdown).toBe('string');
    expect(markdown.length).toBeGreaterThan(0);
  });
});

describe('pmcToPlainText', () => {
  it('should convert FullTextArticle to plain text', () => {
    const article = buildFullTextArticle();
    const text = pmcToPlainText(article);

    expect(text).toContain('Test Article');
    expect(text).toContain('Hello world.');
  });

  it('should delegate to jats toPlainText internally', () => {
    const article = buildFullTextArticle();
    const text = pmcToPlainText(article);

    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('pmcToChunks', () => {
  it('should chunk FullTextArticle with default options', () => {
    const article = buildFullTextArticle();
    const chunks = pmcToChunks(article);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.section).toBe('Introduction');
  });

  it('should chunk FullTextArticle with custom options', () => {
    const article = buildFullTextArticle();
    const chunks = pmcToChunks(article, { maxTokens: 10, overlap: 0 });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('should delegate to jats toChunks internally', () => {
    const article = buildFullTextArticle();
    const chunks = pmcToChunks(article);

    for (const chunk of chunks) {
      expect(chunk.text).toBeDefined();
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });
});
