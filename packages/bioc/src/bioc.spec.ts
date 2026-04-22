import { afterEach, describe, expect, it, vi } from 'vitest';
import { entitySearch, pmc, pmcBatch, pubmed, pubmedBatch } from './bioc';

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

const SAMPLE_DOCUMENT = JSON.stringify({
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

const SAMPLE_XML = '<collection><document><id>33533846</id></document></collection>';

describe('pubmed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with /pmid/get/', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    await pubmed('33533846');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pmid/get/33533846/json');
  });

  it('should default to json format', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    await pubmed('33533846');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toMatch(/\/json$/);
  });

  it('should parse JSON response and return a BioCDocument', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
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
    const xmlResult = await pubmed('33533846', 'xml');
    expect(xmlResult).toBe(SAMPLE_XML);
  });

  it('should throw when id is empty', async () => {
    await expect(pubmed('')).rejects.toThrow('id must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Not found', 404);
    await expect(pubmed('99999999')).rejects.toThrow('BioC API returned status 404');
  });

  it('should encode special characters in the id', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    await pubmed('id with spaces');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('id%20with%20spaces');
  });
});

describe('pmc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with /pmcid/get/', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    await pmc('PMC7096724');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pmcid/get/PMC7096724/json');
  });

  it('should parse JSON response and return a BioCDocument', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pmc('PMC7096724');
    expect(document.id).toBe('33533846');
    expect(document.passages).toHaveLength(2);
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_XML);
    const xmlResult = await pmc('PMC7096724', 'xml');
    expect(xmlResult).toBe(SAMPLE_XML);
  });

  it('should throw when id is empty', async () => {
    await expect(pmc('')).rejects.toThrow('id must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Server error', 500);
    await expect(pmc('PMC0000000')).rejects.toThrow('BioC API returned status 500');
  });
});

function mockFetchJson(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

const SAMPLE_BATCH_RESPONSE = [
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
];

const SAMPLE_BATCH_XML =
  '<collection><document><id>33533846</id></document><document><id>12345678</id></document></collection>';

describe('pubmedBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with comma-separated PMIDs', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    await pubmedBatch(['33533846', '12345678']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/export/biocjson?pmids=33533846,12345678');
  });

  it('should use pubtator3-api base URL', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    await pubmedBatch(['33533846']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('pubtator3-api');
  });

  it('should parse JSON response and return an array of BioCDocuments', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    const documents = await pubmedBatch(['33533846', '12345678']);
    expect(documents).toHaveLength(2);
    expect(documents[0]!.id).toBe('33533846');
    expect(documents[1]!.id).toBe('12345678');
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    const xmlResult = await pubmedBatch(['33533846', '12345678'], 'xml');
    expect(xmlResult).toBe(SAMPLE_BATCH_XML);
  });

  it('should construct the correct URL for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    await pubmedBatch(['33533846'], 'xml');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/export/biocxml?pmids=33533846');
  });

  it('should throw when ids array is empty', async () => {
    await expect(pubmedBatch([])).rejects.toThrow('ids must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Not found', 404);
    await expect(pubmedBatch(['99999999'])).rejects.toThrow('PubTator3 API returned status 404');
  });

  it('should encode special characters in IDs', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    await pubmedBatch(['id one', 'id two']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('id%20one,id%20two');
  });
});

describe('pmcBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with comma-separated PMCIDs', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    await pmcBatch(['PMC7096724', 'PMC1234567']);
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/publications/export/biocjson?pmcids=PMC7096724,PMC1234567');
  });

  it('should parse JSON response and return an array of BioCDocuments', async () => {
    mockFetchText(JSON.stringify(SAMPLE_BATCH_RESPONSE));
    const documents = await pmcBatch(['PMC7096724', 'PMC1234567']);
    expect(documents).toHaveLength(2);
    expect(documents[0]!.id).toBe('33533846');
  });

  it('should return raw string for xml format', async () => {
    mockFetchText(SAMPLE_BATCH_XML);
    const xmlResult = await pmcBatch(['PMC7096724'], 'xml');
    expect(xmlResult).toBe(SAMPLE_BATCH_XML);
  });

  it('should throw when ids array is empty', async () => {
    await expect(pmcBatch([])).rejects.toThrow('ids must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchText('Server error', 500);
    await expect(pmcBatch(['PMC0000000'])).rejects.toThrow('PubTator3 API returned status 500');
  });
});

describe('entitySearch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should construct the correct URL with the query parameter', async () => {
    mockFetchJson([]);
    await entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/entity/autocomplete/?query=covid');
  });

  it('should use pubtator3-api base URL', async () => {
    mockFetchJson([]);
    await entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('pubtator3-api');
  });

  it('should include the type filter when provided', async () => {
    mockFetchJson([]);
    await entitySearch('covid', 'Disease');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('query=covid&type=Disease');
  });

  it('should not include the type parameter when omitted', async () => {
    mockFetchJson([]);
    await entitySearch('covid');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).not.toContain('&type=');
  });

  it('should parse the JSON response', async () => {
    const sampleEntities = [
      { identifier: 'MESH:C000657245', name: 'COVID-19', type: 'Disease' },
      { identifier: 'MESH:D045169', name: 'SARS-CoV-2', type: 'Species' },
    ];
    mockFetchJson(sampleEntities);
    const results = await entitySearch('covid');
    expect(results).toEqual(sampleEntities);
  });

  it('should encode special characters in the query', async () => {
    mockFetchJson([]);
    await entitySearch('BRCA1 gene');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('query=BRCA1%20gene');
  });

  it('should encode special characters in the type filter', async () => {
    mockFetchJson([]);
    await entitySearch('covid', 'type with spaces');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('type=type%20with%20spaces');
  });

  it('should throw when query is empty', async () => {
    await expect(entitySearch('')).rejects.toThrow('query must not be empty');
  });

  it('should throw on non-ok status', async () => {
    mockFetchJson(null, 500);
    await expect(entitySearch('covid')).rejects.toThrow('PubTator3 API returned status 500');
  });
});

describe('document mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should map the document id', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.id).toBe('33533846');
  });

  it('should map the correct number of passages', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.passages).toHaveLength(2);
  });

  it('should map passage offset', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.passages[0]!.offset).toBe(0);
    expect(document.passages[1]!.offset).toBe(22);
  });

  it('should map passage text', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.passages[0]!.text).toBe('COVID-19 and variants');
    expect(document.passages[1]!.text).toBe('Body text here.');
  });

  it('should map passage infons', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.passages[0]!.infons).toEqual({ type: 'title' });
    expect(document.passages[1]!.infons).toEqual({ type: 'abstract' });
  });

  it('should map annotations with id, text, and infons', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    const annotation = document.passages[0]!.annotations[0]!;
    expect(annotation.id).toBe('1');
    expect(annotation.text).toBe('COVID-19');
    expect(annotation.infons).toEqual({ type: 'Disease', identifier: 'MESH:C000657245' });
  });

  it('should map annotation locations with offset and length', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    const location = document.passages[0]!.annotations[0]!.locations[0]!;
    expect(location.offset).toBe(0);
    expect(location.length).toBe(8);
  });

  it('should map empty annotations array', async () => {
    mockFetchText(SAMPLE_DOCUMENT);
    const document = await pubmed('33533846');
    expect(document.passages[1]!.annotations).toEqual([]);
  });
});
