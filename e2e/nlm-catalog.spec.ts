import { describe, expect, it } from 'vitest';
import { NlmCatalog } from '@ncbijs/nlm-catalog';
import { ncbiApiKey } from './test-config';

const nlmCatalog = new NlmCatalog({
  apiKey: ncbiApiKey,
});

describe('NlmCatalog E2E', () => {
  it('should search for journal records', async () => {
    const searchResult = await nlmCatalog.search('genetics journal', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch catalog details by UID', async () => {
    const searchResult = await nlmCatalog.search('nature', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await nlmCatalog.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
  });
});
