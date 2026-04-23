import { describe, expect, it } from 'vitest';
import { DbVar } from '@ncbijs/dbvar';
import { ncbiApiKey } from './test-config';

const dbvar = new DbVar({
  apiKey: ncbiApiKey,
});

describe('DbVar E2E', () => {
  it('should search for structural variants', async () => {
    const searchResult = await dbvar.search('BRCA1', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch variant details by UID', async () => {
    const searchResult = await dbvar.search('deletion Homo sapiens', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await dbvar.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
  });
});
