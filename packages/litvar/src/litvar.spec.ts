import { afterEach, describe, expect, it, vi } from 'vitest';
import { publications, variant } from './litvar';

function mockFetchJson(data: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
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
    await variant('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/get/litvar/rs328%23%23',
    );
  });

  it('should map rsid from response', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const result = await variant('rs328');
    expect(result.rsid).toBe('rs328');
  });

  it('should map hgvs_list to hgvs', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const result = await variant('rs328');
    expect(result.hgvs).toEqual(['NC_000008.11:g.19962213G>C', 'NM_000237.3:c.1421C>G']);
  });

  it('should map gene from response', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const result = await variant('rs328');
    expect(result.gene).toBe('LPL');
  });

  it('should map pmid_count to publicationCount', async () => {
    mockFetchJson(SAMPLE_VARIANT_RESPONSE);
    const result = await variant('rs328');
    expect(result.publicationCount).toBe(42);
  });

  it('should throw when results array is empty', async () => {
    mockFetchJson({ results: [] });
    await expect(variant('rs999999')).rejects.toThrow('No variant found for rs999999');
  });

  it('should throw when results is missing', async () => {
    mockFetchJson({});
    await expect(variant('rs999999')).rejects.toThrow('No variant found for rs999999');
  });

  it('should throw when rsid is empty', async () => {
    await expect(variant('')).rejects.toThrow('rsid must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    await expect(variant('rs328')).rejects.toThrow('LitVar API returned status 500');
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    await expect(variant('rs328')).rejects.toThrow('LitVar API returned status 404');
  });
});

describe('publications', () => {
  const SAMPLE_PUBLICATIONS = [
    { pmid: 12345678, title: 'Variant effects on LPL', journal: 'Nature', year: 2023 },
    { pmid: 87654321, title: 'LPL gene study', journal: 'Science', year: 2022 },
  ];

  it('should construct the correct URL with %23%23 suffix', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    await publications('rs328');
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toBe(
      'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/publications/litvar/rs328%23%23',
    );
  });

  it('should return array of publications', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const result = await publications('rs328');
    expect(result).toHaveLength(2);
  });

  it('should include pmid in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const result = await publications('rs328');
    expect(result[0]!.pmid).toBe(12345678);
    expect(result[1]!.pmid).toBe(87654321);
  });

  it('should include title in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const result = await publications('rs328');
    expect(result[0]!.title).toBe('Variant effects on LPL');
  });

  it('should include journal in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const result = await publications('rs328');
    expect(result[0]!.journal).toBe('Nature');
  });

  it('should include year in each publication', async () => {
    mockFetchJson(SAMPLE_PUBLICATIONS);
    const result = await publications('rs328');
    expect(result[0]!.year).toBe(2023);
  });

  it('should return empty array when API returns empty array', async () => {
    mockFetchJson([]);
    const result = await publications('rs328');
    expect(result).toHaveLength(0);
  });

  it('should throw when rsid is empty', async () => {
    await expect(publications('')).rejects.toThrow('rsid must not be empty');
  });

  it('should throw on non-ok response status', async () => {
    mockFetchJson(null, 500);
    await expect(publications('rs328')).rejects.toThrow('LitVar API returned status 500');
  });

  it('should throw on 404 response status', async () => {
    mockFetchJson(null, 404);
    await expect(publications('rs328')).rejects.toThrow('LitVar API returned status 404');
  });
});
