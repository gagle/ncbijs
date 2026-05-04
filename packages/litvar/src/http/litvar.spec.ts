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
  const SAMPLE_VARIANT = {
    rsid: 'rs328',
    gene: ['LPL'],
    name: 'p.S447X',
    hgvs: 'p.S447X',
    data_clinical_significance: ['benign'],
  };

  it('should construct the correct URL with litvar@ prefix and %23%23 suffix', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    await client.variant('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/get/litvar@rs328%23%23',
    );
  });

  it('should map rsid from response', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.rsid).toBe('rs328');
  });

  it('should map gene as array from response', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.gene).toEqual(['LPL']);
  });

  it('should map name from response', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.name).toBe('p.S447X');
  });

  it('should map hgvs from response', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.hgvs).toBe('p.S447X');
  });

  it('should map clinicalSignificance from data_clinical_significance', async () => {
    mockFetchJson(SAMPLE_VARIANT);
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.clinicalSignificance).toEqual(['benign']);
  });

  it('should default rsid to empty string when missing', async () => {
    mockFetchJson({ gene: ['LPL'], name: 'p.S447X' });
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.rsid).toBe('');
  });

  it('should default gene to empty array when missing', async () => {
    mockFetchJson({ rsid: 'rs328', name: 'p.S447X' });
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.gene).toEqual([]);
  });

  it('should default name to empty string when missing', async () => {
    mockFetchJson({ rsid: 'rs328' });
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.name).toBe('');
  });

  it('should default hgvs to empty string when missing', async () => {
    mockFetchJson({ rsid: 'rs328' });
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.hgvs).toBe('');
  });

  it('should default clinicalSignificance to empty array when missing', async () => {
    mockFetchJson({ rsid: 'rs328' });
    const client = new LitVar();
    const result = await client.variant('rs328');
    expect(result.clinicalSignificance).toEqual([]);
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
  const SAMPLE_PUBLICATIONS = {
    pmids: [11122694, 16132104, 23900168],
    pmcids: ['PMC4661509', 'PMC4349157'],
    pmids_count: 744,
  };

  it('should construct the correct URL with /publications suffix', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    await client.publications('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/get/litvar@rs328%23%23/publications',
    );
  });

  it('should return pmids from response', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.pmids).toEqual([11122694, 16132104, 23900168]);
  });

  it('should return pmcids from response', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.pmcids).toEqual(['PMC4661509', 'PMC4349157']);
  });

  it('should return count from pmids_count', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.count).toBe(744);
  });

  it('should default pmids to empty array when missing', async () => {
    mockFetchJson({ pmcids: [], pmids_count: 0 });
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.pmids).toEqual([]);
  });

  it('should default pmcids to empty array when missing', async () => {
    mockFetchJson({ pmids: [], pmids_count: 0 });
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.pmcids).toEqual([]);
  });

  it('should default count to 0 when missing', async () => {
    mockFetchJson({ pmids: [], pmcids: [] });
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result.count).toBe(0);
  });

  it('should default all fields when response is empty object', async () => {
    mockFetchJson({});
    const client = new LitVar();
    const result = await client.publications('rs328');
    expect(result).toEqual({ pmids: [], pmcids: [], count: 0 });
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
  const SAMPLE_RESULTS = [
    {
      rsid: 'rs328',
      gene: ['LPL'],
      name: 'p.S447X',
      hgvs: 'p.S447X',
      pmids_count: 744,
      data_clinical_significance: ['benign'],
      match: 'Matched on rsid <m>rs328</m>',
    },
  ];

  it('should construct the correct autocomplete URL', async () => {
    mockFetchJson(SAMPLE_RESULTS);
    const client = new LitVar();
    await client.search('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/variant/autocomplete/?query=rs328');
  });

  it('should encode query parameter', async () => {
    mockFetchJson([]);
    const client = new LitVar();
    await client.search('BRCA1 variant');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('query=BRCA1+variant');
  });

  it('should map search results', async () => {
    mockFetchJson(SAMPLE_RESULTS);
    const client = new LitVar();
    const results = await client.search('rs328');
    expect(results).toHaveLength(1);
    expect(results[0]!.rsid).toBe('rs328');
    expect(results[0]!.gene).toEqual(['LPL']);
    expect(results[0]!.name).toBe('p.S447X');
    expect(results[0]!.publicationCount).toBe(744);
    expect(results[0]!.match).toBe('Matched on rsid <m>rs328</m>');
  });

  it('should default all fields when result has empty objects', async () => {
    mockFetchJson([{}]);
    const client = new LitVar();
    const results = await client.search('test');
    expect(results[0]).toEqual({
      rsid: '',
      gene: [],
      name: '',
      hgvs: '',
      publicationCount: 0,
      clinicalSignificance: [],
      match: '',
    });
  });

  it('should return empty array when API returns empty array', async () => {
    mockFetchJson([]);
    const client = new LitVar();
    const results = await client.search('nonexistent');
    expect(results).toHaveLength(0);
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
