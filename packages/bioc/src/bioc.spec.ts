import { afterEach, describe, expect, it, vi } from 'vitest';
import { pmc, pubmed } from './bioc';

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
