import { afterEach, describe, expect, it, vi } from 'vitest';
import { BioC } from './bioc';

function mockFetchText(text: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(text),
    }),
  );
}

const SAMPLE_COLLECTION = JSON.stringify({
  source: 'PubMed',
  date: '20260207',
  key: 'collection.key',
  infons: {},
  documents: [
    {
      id: '33533846',
      passages: [
        {
          offset: 0,
          text: 'COVID-19 and variants',
          infons: { type: 'title' },
          annotations: [
            {
              id: '1',
              text: 'COVID-19',
              infons: { type: 'Disease', identifier: 'MESH:C000657245' },
              locations: [{ offset: 0, length: 8 }],
            },
          ],
        },
        {
          offset: 22,
          text: 'Body text here.',
          infons: { type: 'abstract' },
          annotations: [],
        },
      ],
    },
  ],
});

const SAMPLE_XML = '<collection><document><id>33533846</id></document></collection>';

describe('pubmed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with pubmed.cgi/BioC_json', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    await client.pubmed('33533846');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pubmed.cgi/BioC_json/33533846/unicode');
  });

  it('should default to json format', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    await client.pubmed('33533846');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/BioC_json/');
  });

  it('should extract the first document from the collection wrapper', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document).toEqual({
      id: '33533846',
      passages: [
        {
          offset: 0,
          text: 'COVID-19 and variants',
          infons: { type: 'title' },
          annotations: [
            {
              id: '1',
              text: 'COVID-19',
              infons: { type: 'Disease', identifier: 'MESH:C000657245' },
              locations: [{ offset: 0, length: 8 }],
            },
          ],
        },
        {
          offset: 22,
          text: 'Body text here.',
          infons: { type: 'abstract' },
          annotations: [],
        },
      ],
    });
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_XML);
    const client = new BioC();
    const xmlResult = await client.pubmed('33533846', 'xml');
    expect(xmlResult).toBe(SAMPLE_XML);
  });

  it('should use BioC_xml format for xml requests', async () => {
    mockFetchText(SAMPLE_XML);
    const client = new BioC();
    await client.pubmed('33533846', 'xml');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pubmed.cgi/BioC_xml/33533846/unicode');
  });

  it('should throw when id is empty', async () => {
    const client = new BioC();
    await expect(client.pubmed('')).rejects.toThrow('id must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Not found', 404);
    const client = new BioC();
    await expect(client.pubmed('99999999')).rejects.toThrow('BioC API returned status 404');
  });

  it('should encode special characters in the id', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    await client.pubmed('id with spaces');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('id%20with%20spaces');
  });
});

describe('pmc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with pmcoa.cgi/BioC_json', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    await client.pmc('PMC7096724');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pmcoa.cgi/BioC_json/PMC7096724/unicode');
  });

  it('should extract the first document from the collection wrapper', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pmc('PMC7096724');
    expect(document.id).toBe('33533846');
    expect(document.passages).toHaveLength(2);
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_XML);
    const client = new BioC();
    const xmlResult = await client.pmc('PMC7096724', 'xml');
    expect(xmlResult).toBe(SAMPLE_XML);
  });

  it('should use BioC_xml format for xml requests', async () => {
    mockFetchText(SAMPLE_XML);
    const client = new BioC();
    await client.pmc('PMC7096724', 'xml');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pmcoa.cgi/BioC_xml/PMC7096724/unicode');
  });

  it('should throw when id is empty', async () => {
    const client = new BioC();
    await expect(client.pmc('')).rejects.toThrow('id must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Server error', 500);
    const client = new BioC();
    await expect(client.pmc('PMC0000000')).rejects.toThrow('BioC API returned status 500');
  });
});

const SAMPLE_BATCH_RESPONSE = JSON.stringify([
  {
    id: '33533846',
    passages: [
      {
        offset: 0,
        text: 'COVID-19 and variants',
        infons: { type: 'title' },
        annotations: [],
      },
    ],
  },
  {
    id: '12345678',
    passages: [
      {
        offset: 0,
        text: 'Second article',
        infons: { type: 'title' },
        annotations: [],
      },
    ],
  },
]);

const SAMPLE_BATCH_XML =
  '<collection><document><id>33533846</id></document><document><id>12345678</id></document></collection>';

describe('pubmedBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with comma-separated PMIDs', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    await client.pubmedBatch(['33533846', '12345678']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/export/biocjson?pmids=33533846,12345678');
  });

  it('should use pubtator3-api base URL', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    await client.pubmedBatch(['33533846']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('pubtator3-api');
  });

  it('should parse JSON response and return an array of BioCDocuments', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    const documents = await client.pubmedBatch(['33533846', '12345678']);
    expect(documents).toHaveLength(2);
    expect(documents[0]!.id).toBe('33533846');
    expect(documents[1]!.id).toBe('12345678');
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    const client = new BioC();
    const xmlResult = await client.pubmedBatch(['33533846', '12345678'], 'xml');
    expect(xmlResult).toBe(SAMPLE_BATCH_XML);
  });

  it('should construct the correct URL for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    const client = new BioC();
    await client.pubmedBatch(['33533846'], 'xml');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/export/biocxml?pmids=33533846');
  });

  it('should throw when ids array is empty', async () => {
    const client = new BioC();
    await expect(client.pubmedBatch([])).rejects.toThrow('ids must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Not found', 404);
    const client = new BioC();
    await expect(client.pubmedBatch(['99999999'])).rejects.toThrow('BioC API returned status 404');
  });

  it('should encode special characters in IDs', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    await client.pubmedBatch(['id one', 'id two']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('id%20one,id%20two');
  });
});

describe('pmcBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with /pmc_export/ for PMCIDs', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    await client.pmcBatch(['PMC7096724', 'PMC1234567']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/pmc_export/biocjson?pmcids=PMC7096724,PMC1234567');
  });

  it('should parse JSON response and return an array of BioCDocuments', async () => {
    mockFetchText(SAMPLE_BATCH_RESPONSE);
    const client = new BioC();
    const documents = await client.pmcBatch(['PMC7096724', 'PMC1234567']);
    expect(documents).toHaveLength(2);
    expect(documents[0]!.id).toBe('33533846');
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    const client = new BioC();
    const xmlResult = await client.pmcBatch(['PMC7096724'], 'xml');
    expect(xmlResult).toBe(SAMPLE_BATCH_XML);
  });

  it('should throw when ids array is empty', async () => {
    const client = new BioC();
    await expect(client.pmcBatch([])).rejects.toThrow('ids must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Server error', 500);
    const client = new BioC();
    await expect(client.pmcBatch(['PMC0000000'])).rejects.toThrow('BioC API returned status 500');
  });
});

describe('entitySearch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with the query parameter', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/entity/autocomplete/?query=covid');
  });

  it('should use pubtator3-api base URL', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('pubtator3-api');
  });

  it('should include the type filter when provided', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('covid', 'Disease');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('query=covid&type=Disease');
  });

  it('should not include the type parameter when omitted', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).not.toContain('&type=');
  });

  it('should map raw API fields to EntitySearchResult', async () => {
    const rawEntities = [
      {
        _id: '@DISEASE_COVID-19',
        biotype: 'disease',
        db_id: 'MESH:C000657245',
        db: 'mesh',
        name: 'COVID-19',
        description: 'All Species',
        match: 'COVID-19',
      },
      {
        _id: '@SPECIES_SARS-CoV-2',
        biotype: 'species',
        db_id: 'MESH:D045169',
        db: 'mesh',
        name: 'SARS-CoV-2',
        description: 'All Species',
        match: 'SARS-CoV-2',
      },
    ];
    mockFetchText(JSON.stringify(rawEntities));
    const client = new BioC();
    const results = await client.entitySearch('covid');
    expect(results).toEqual([
      { id: 'MESH:C000657245', name: 'COVID-19', type: 'disease' },
      { id: 'MESH:D045169', name: 'SARS-CoV-2', type: 'species' },
    ]);
  });

  it('should encode special characters in the query', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('BRCA1 gene');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('query=BRCA1%20gene');
  });

  it('should encode special characters in the type filter', async () => {
    mockFetchText('[]');
    const client = new BioC();
    await client.entitySearch('covid', 'type with spaces');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('type=type%20with%20spaces');
  });

  it('should throw when query is empty', async () => {
    const client = new BioC();
    await expect(client.entitySearch('')).rejects.toThrow('query must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('', 500);
    const client = new BioC();
    await expect(client.entitySearch('covid')).rejects.toThrow('BioC API returned status 500');
  });
});

describe('document mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should map the document id', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.id).toBe('33533846');
  });

  it('should map the correct number of passages', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.passages).toHaveLength(2);
  });

  it('should map passage offset', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.passages[0]!.offset).toBe(0);
    expect(document.passages[1]!.offset).toBe(22);
  });

  it('should map passage text', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.passages[0]!.text).toBe('COVID-19 and variants');
    expect(document.passages[1]!.text).toBe('Body text here.');
  });

  it('should map passage infons', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.passages[0]!.infons).toEqual({ type: 'title' });
    expect(document.passages[1]!.infons).toEqual({ type: 'abstract' });
  });

  it('should map annotations with id, text, and infons', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    const annotation = document.passages[0]!.annotations[0]!;
    expect(annotation.id).toBe('1');
    expect(annotation.text).toBe('COVID-19');
    expect(annotation.infons).toEqual({ type: 'Disease', identifier: 'MESH:C000657245' });
  });

  it('should map annotation locations with offset and length', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    const location = document.passages[0]!.annotations[0]!.locations[0]!;
    expect(location.offset).toBe(0);
    expect(location.length).toBe(8);
  });

  it('should map empty annotations array', async () => {
    mockFetchText(SAMPLE_COLLECTION);
    const client = new BioC();
    const document = await client.pubmed('33533846');
    expect(document.passages[1]!.annotations).toEqual([]);
  });
});
