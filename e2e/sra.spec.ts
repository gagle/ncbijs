import { describe, expect, it } from 'vitest';
import { Sra } from '@ncbijs/sra';

const sra = new Sra({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('Sra E2E', () => {
  it('should search for sequencing experiments', async () => {
    const searchResult = await sra.search('Homo sapiens RNA-seq', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch experiment details by UID', async () => {
    const searchResult = await sra.search('ILLUMINA RNA-Seq', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const experiments = await sra.fetch(searchResult.ids);

    expect(experiments).toHaveLength(1);
    expect(experiments[0]!.uid).toBeTruthy();
    expect(experiments[0]!.title).toBeTruthy();
  });
});
