import { describe, expect, it } from 'vitest';
import { Omim } from '@ncbijs/omim';
import { ncbiApiKey } from './test-config';

const omim = new Omim({
  apiKey: ncbiApiKey,
});

describe('Omim E2E', () => {
  it('should search for hemoglobin-related entries', async () => {
    const searchResult = await omim.search('hemoglobin', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch entry details by UID', async () => {
    const searchResult = await omim.search('HBB', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const entries = await omim.fetch(searchResult.ids);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.uid).toBeTruthy();
    expect(entries[0]!.title).toBeTruthy();
  });
});
