import { describe, expect, it } from 'vitest';
import { Cdd } from '@ncbijs/cdd';

const cdd = new Cdd({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('Cdd E2E', () => {
  it('should search for conserved domains', async () => {
    const searchResult = await cdd.search('zinc finger', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch domain details by UID', async () => {
    const searchResult = await cdd.search('kinase', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await cdd.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
    expect(records[0]!.accession).toBeTruthy();
  });
});
