import { describe, expect, it } from 'vitest';
import { Gtr } from '@ncbijs/gtr';
import { ncbiApiKey } from './test-config';

const gtr = new Gtr({
  apiKey: ncbiApiKey,
});

describe('Gtr E2E', () => {
  it('should search for genetic tests', async () => {
    const searchResult = await gtr.search('BRCA1', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch test details by UID', async () => {
    const searchResult = await gtr.search('BRCA1[gene]', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const tests = await gtr.fetch(searchResult.ids);

    expect(tests).toHaveLength(1);
    expect(tests[0]!.uid).toBeTruthy();
    expect(tests[0]!.testName).toBeTruthy();
  });
});
