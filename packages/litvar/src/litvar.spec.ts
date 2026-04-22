import { afterEach, describe, expect, it, vi } from 'vitest';
import { LitVar } from './litvar';

function mockFetchJson(data: unknown, status = 200): void {
  const text = JSON.stringify(data);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(text),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('variant', () => {
  const SAMPLE_VARIANT_RESPONSE = {
    results: [
      {
        rsid: 'rs328',
        hgvs_list: ['NC_000008.11:g.19962213G>C', 'NM_000237.3:c.1421C>G'],
        gene: 'LPL',
        pmid_count: 42,
      },
    ],
  };

  it('should construct the correct URL with %23%23 suffix', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const client = new LitVar();
    await client.variant('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/get/litvar/rs328%23%23',
    );
  });

  it('should map rsid from response', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.rsid).toBe('rs328');
  });

  it('should map hgvs_list to hgvs', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.hgvs).toEqual(['NC_000008.11:g.19962213G>C', 'NM_000237.3:c.1421C>G']);
  });

  it('should map gene from response', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.gene).toBe('LPL');
  });

  it('should map pmid_count to publicationCount', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.publicationCount).toBe(42);
  });

  it('should throw when results array is empty', async () => {
    mockFetchJson({ results: [] });
    const client = new LitVar();
    await expect(client.variant('rs999999')).rejects.toThrow('No variant found for rs999999');
  });

  it('should throw when results is missing', async () => {
    mockFetchJson({});
    const client = new LitVar();
    await expect(client.variant('rs999999')).rejects.toThrow('No variant found for rs999999');
  });

  it('should throw when rsid is empty', async () => {
    const client = new LitVar();
    await expect(client.variant('')).rejects.toThrow('rsid must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    const client = new LitVar();
    await expect(client.variant('rs328')).rejects.toThrow('LitVar API returned status 500');
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    const client = new LitVar();
    await expect(client.variant('rs328')).rejects.toThrow('LitVar API returned status 404');
  });
});

describe('publications', () => {
  const SAMPLE_PUBLICATIONS = [
    { pmid: 12345678, title: 'Variant effects on LPL', journal: 'Nature', year: 2023 },
    { pmid: 87654321, title: 'LPL gene study', journal: 'Science', year: 2022 },
  ];

  it('should construct the correct URL with %23%23 suffix', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    await client.publications('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/publications/litvar/rs328%23%23',
    );
  });

  it('should return array of publications', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result).toHaveLength(2);
  });

  it('should include pmid in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result[0]!.pmid).toBe(12345678);
    expect(result[1]!.pmid).toBe(87654321);
  });

  it('should include title in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result[0]!.title).toBe('Variant effects on LPL');
  });

  it('should include journal in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result[0]!.journal).toBe('Nature');
  });

  it('should include year in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result[0]!.year).toBe(2023);
  });

  it('should return empty array when API returns empty array', async () => {
    mockFetchJson([]);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result).toHaveLength(0);
  });

  it('should throw when rsid is empty', async () => {
    const client = new LitVar();
    await expect(client.publications('')).rejects.toThrow('rsid must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    const client = new LitVar();
    await expect(client.publications('rs328')).rejects.toThrow('LitVar API returned status 500');
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    const client = new LitVar();
    await expect(client.publications('rs328')).rejects.toThrow('LitVar API returned status 404');
  });
});

describe('search', () => {
  const SAMPLE_SEARCH_RESULTS = [
    { term: 'rs328', type: 'variant', score: 0.95 },
    { term: 'rs7412', type: 'variant', score: 0.72 },
  ];

  it('should construct the correct URL with encoded query', async () => {
    mockFetchJson(SAMPLE_SEARCH_RESULTS);
    const client = new LitVar();
    await client.search('BRCA1 variant');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/api/v1/entity/search/BRCA1%20variant',
    );
  });

  it('should return array of search results', async () => {
    mockFetchJson(SAMPLE_SEARCH_RESULTS);
    const client = new LitVar();
    const result = await client.search('LPL');
    expect(result).toHaveLength(2);
  });

  it('should include term in each result', async () => {
    mockFetchJson(SAMPLE_SEARCH_RESULTS);
    const client = new LitVar();
    const result = await client.search('LPL');
    expect(result[0]!.term).toBe('rs328');
  });

  it('should include type in each result', async () => {
    mockFetchJson(SAMPLE_SEARCH_RESULTS);
    const client = new LitVar();
    const result = await client.search('LPL');
    expect(result[0]!.type).toBe('variant');
  });

  it('should include score in each result', async () => {
    mockFetchJson(SAMPLE_SEARCH_RESULTS);
    const client = new LitVar();
    const result = await client.search('LPL');
    expect(result[0]!.score).toBe(0.95);
  });

  it('should return empty array when API returns empty array', async () => {
    mockFetchJson([]);
    const client = new LitVar();
    const result = await client.search('nonexistent');
    expect(result).toHaveLength(0);
  });

  it('should throw when query is empty', async () => {
    const client = new LitVar();
    await expect(client.search('')).rejects.toThrow('query must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    const client = new LitVar();
    await expect(client.search('LPL')).rejects.toThrow('LitVar API returned status 500');
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    const client = new LitVar();
    await expect(client.search('LPL')).rejects.toThrow('LitVar API returned status 404');
  });
});

describe('variantAnnotations', () => {
  const SAMPLE_ANNOTATIONS = [
    { disease: 'Coronary artery disease', genes: ['LPL', 'APOC2'], pmids: [12345678, 87654321] },
    { disease: 'Hypertriglyceridemia', genes: ['LPL'], pmids: [11111111] },
  ];

  it('should construct the correct URL with %23%23 suffix and /annotations path', async () => {
    mockFetchJson(SAMPLE_ANNOTATIONS);
    const client = new LitVar();
    await client.variantAnnotations('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/api/v1/entity/litvar/rs328%23%23/annotations',
    );
  });

  it('should return array of annotations', async () => {
    mockFetchJson(SAMPLE_ANNOTATIONS);
    const client = new LitVar();
    const result = await client.variantAnnotations('rs328');
    expect(result).toHaveLength(2);
  });

  it('should include disease in each annotation', async () => {
    mockFetchJson(SAMPLE_ANNOTATIONS);
    const client = new LitVar();
    const result = await client.variantAnnotations('rs328');
    expect(result[0]!.disease).toBe('Coronary artery disease');
  });

  it('should include genes in each annotation', async () => {
    mockFetchJson(SAMPLE_ANNOTATIONS);
    const client = new LitVar();
    const result = await client.variantAnnotations('rs328');
    expect(result[0]!.genes).toEqual(['LPL', 'APOC2']);
  });

  it('should include pmids in each annotation', async () => {
    mockFetchJson(SAMPLE_ANNOTATIONS);
    const client = new LitVar();
    const result = await client.variantAnnotations('rs328');
    expect(result[0]!.pmids).toEqual([12345678, 87654321]);
  });

  it('should return empty array when API returns empty array', async () => {
    mockFetchJson([]);
    const client = new LitVar();
    const result = await client.variantAnnotations('rs328');
    expect(result).toHaveLength(0);
  });

  it('should throw when rsid is empty', async () => {
    const client = new LitVar();
    await expect(client.variantAnnotations('')).rejects.toThrow('rsid must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    const client = new LitVar();
    await expect(client.variantAnnotations('rs328')).rejects.toThrow(
      'LitVar API returned status 500',
    );
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    const client = new LitVar();
    await expect(client.variantAnnotations('rs328')).rejects.toThrow(
      'LitVar API returned status 404',
    );
  });
});
