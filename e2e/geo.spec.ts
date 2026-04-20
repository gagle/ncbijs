import { describe, expect, it } from 'vitest';
import { Geo } from '@ncbijs/geo';

const geo = new Geo({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('Geo E2E', () => {
  it('should search for gene expression datasets', async () => {
    const searchResult = await geo.search('breast cancer RNA-seq', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch dataset details by UID', async () => {
    const searchResult = await geo.search('Homo sapiens RNA-seq', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await geo.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
    expect(records[0]!.title).toBeTruthy();
  });
});
