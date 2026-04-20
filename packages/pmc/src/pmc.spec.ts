import { describe, it, expect, afterEach, vi } from 'vitest';
import { PMC, pmcToMarkdown, pmcToPlainText, pmcToChunks } from './pmc';
import type { FullTextArticle } from './interfaces/pmc.interface';

const mockEFetch = vi.fn();

vi.mock('@ncbijs/eutils', () => ({
  EUtils: vi.fn(function () {
    return { efetch: mockEFetch };
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

function mockFetch(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

const OA_LOOKUP_RESPONSE = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC12345" citation="Smith J. Test. 2024." license="CC BY" retracted="no">
      <link format="tgz" href="https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/PMC12345.tar.gz" updated="2024-01-15 00:00:00"/>
      <link format="pdf" href="https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/PMC12345.pdf" updated="2024-01-15 00:00:00"/>
    </record>
  </records>
</OA>`;

const OA_ERROR_RESPONSE = `<?xml version="1.0"?>
<OA>
  <error code="idIsNotOpenAccess">PMC99999 is not Open Access</error>
</OA>`;

const OA_SINCE_RESPONSE = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="1">
    <record id="PMC11111" citation="Doe J. Study. 2024." license="CC0" retracted="no">
      <link format="tgz" href="https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/PMC11111.tar.gz" updated="2024-06-01 00:00:00"/>
    </record>
  </records>
</OA>`;

const OA_SINCE_PAGE2_RESPONSE = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="2">
    <record id="PMC22222" citation="Lee K. Research. 2024." license="CC BY" retracted="no">
      <link format="tgz" href="https://example.com/PMC22222.tar.gz" updated="2024-06-02 00:00:00"/>
    </record>
  </records>
</OA>`;

const OA_SINCE_WITH_RESUMPTION = `<?xml version="1.0"?>
<OA>
  <records returned-count="1" total-count="2">
    <record id="PMC11111" citation="Doe J. Study. 2024." license="CC0" retracted="no">
      <link format="tgz" href="https://example.com/PMC11111.tar.gz" updated="2024-06-01 00:00:00"/>
    </record>
  </records>
  <resumption offset="1" count="1" total="2">
    <link href="https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?resumptionToken=abc123"/>
  </resumption>
</OA>`;

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
  });

  describe('oa.lookup', () => {
    it('should fetch OA record for PMCID', async () => {
      mockFetch(OA_LOOKUP_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.pmcid).toBe('PMC12345');
    });

    it('should parse citation and license', async () => {
      mockFetch(OA_LOOKUP_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.citation).toBe('Smith J. Test. 2024.');
      expect(record.license).toBe('CC BY');
    });

    it('should parse retracted flag', async () => {
      const retractedXml = OA_LOOKUP_RESPONSE.replace('retracted="no"', 'retracted="yes"');
      mockFetch(retractedXml);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.retracted).toBe(true);
    });

    it('should parse links with format and href', async () => {
      mockFetch(OA_LOOKUP_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.links).toHaveLength(2);
      expect(record.links[0]?.format).toBe('tgz');
      expect(record.links[1]?.format).toBe('pdf');
      expect(record.links[0]?.href).toContain('tar.gz');
    });

    it('should parse updated timestamp on links', async () => {
      mockFetch(OA_LOOKUP_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.links[0]?.updated).toBe('2024-01-15 00:00:00');
    });

    it('should handle FTP URLs', async () => {
      mockFetch(OA_LOOKUP_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.links[0]?.href).toContain('ftp.ncbi.nlm.nih.gov');
    });

    it('should handle S3 URLs', async () => {
      const s3Xml = OA_LOOKUP_RESPONSE.replace(
        'https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/PMC12345.tar.gz',
        'https://pmc-oa-opendata.s3.amazonaws.com/oa_comm/PMC12345.tar.gz',
      );
      mockFetch(s3Xml);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oa.lookup('PMC12345');

      expect(record.links[0]?.href).toContain('s3.amazonaws.com');
    });

    it('should throw on non-OA article', async () => {
      mockFetch(OA_ERROR_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oa.lookup('PMC99999')).rejects.toThrow('OA Service error');
    });
  });

  describe('oa.since', () => {
    it('should yield OARecords since given date', async () => {
      mockFetch(OA_SINCE_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
    });

    it('should support until option', async () => {
      mockFetch(OA_SINCE_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2024-01-01', { until: '2024-06-30' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('until=2024-06-30');
    });

    it('should support format filter', async () => {
      mockFetch(OA_SINCE_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2024-01-01', { format: 'pdf' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('format=pdf');
    });

    it('should paginate with resumptionToken', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve(OA_SINCE_WITH_RESUMPTION),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve(OA_SINCE_PAGE2_RESPONSE),
          }),
      );

      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(2);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('should stop when no more results', async () => {
      mockFetch(OA_SINCE_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2024-01-01')) {
        records.push(record);
      }

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should handle empty result set', async () => {
      mockFetch('<OA><records returned-count="0" total-count="0"></records></OA>');
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oa.since('2099-01-01')) {
        records.push(record);
      }

      expect(records).toHaveLength(0);
    });
  });

  describe('oai.listRecords', () => {
    it('should yield OAIRecords with identifier and metadata', async () => {
      mockFetch(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(records).toHaveLength(1);
    });

    it('should support from option', async () => {
      mockFetch(OAI_LIST_RESPONSE);
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
      mockFetch(OAI_LIST_RESPONSE);
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
      mockFetch(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      const records = [];
      for await (const record of pmc.oai.listRecords({ set: 'pmc-open' })) {
        records.push(record);
      }

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('set=pmc-open');
    });

    it('should support metadataPrefix option', async () => {
      mockFetch(OAI_LIST_RESPONSE);
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
      mockFetch(OAI_LIST_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const records: Array<unknown> = [];

      for await (const record of pmc.oai.listRecords({ from: '2024-01-01' })) {
        records.push(record);
      }

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should use correct OAI-PMH URL', async () => {
      mockFetch(OAI_LIST_RESPONSE);
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
      mockFetch(`<?xml version="1.0"?>
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
  });

  describe('oai.getRecord', () => {
    it('should fetch single OAI record by PMCID', async () => {
      mockFetch(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oai.getRecord('PMC12345');

      expect(record.identifier).toBe('oai:pubmedcentral.nih.gov:12345');
    });

    it('should return identifier, datestamp, setSpec, metadata', async () => {
      mockFetch(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      const record = await pmc.oai.getRecord('PMC12345');

      expect(record.identifier).toBe('oai:pubmedcentral.nih.gov:12345');
      expect(record.datestamp).toBe('2024-01-01');
      expect(record.setSpec).toBe('pmc-open');
      expect(record.metadata).toContain('Full JATS XML');
    });

    it('should support custom metadataPrefix', async () => {
      mockFetch(OAI_GET_RECORD_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);
      await pmc.oai.getRecord('PMC12345', 'oai_dc');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const url = fetchCall?.[0] as string;
      expect(url).toContain('metadataPrefix=oai_dc');
    });

    it('should throw on non-existent record', async () => {
      mockFetch(OAI_ERROR_RESPONSE);
      const pmc = new PMC(VALID_CONFIG);

      await expect(pmc.oai.getRecord('PMC99999')).rejects.toThrow('OAI-PMH error');
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
