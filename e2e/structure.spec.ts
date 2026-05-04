import { describe, expect, it } from 'vitest';
import { Structure } from '@ncbijs/structure';
import { ncbiApiKey } from './test-config';

const structure = new Structure({
  apiKey: ncbiApiKey,
});

describe('Structure E2E', () => {
  it('should search for protein structures', async () => {
    const searchResult = await structure.search('p53', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch structure details by UID', async () => {
    const searchResult = await structure.search('insulin', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await structure.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
    expect(records[0]!.pdbAccession).toBeTruthy();
  });
});
