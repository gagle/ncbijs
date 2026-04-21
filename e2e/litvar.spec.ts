import { describe, expect, it } from 'vitest';
import { variant, publications } from '@ncbijs/litvar';

describe('LitVar E2E', () => {
  it('should fetch variant info by rsID', async () => {
    const result = await variant('rs328');

    expect(result.rsid).toBe('rs328');
    expect(result.gene).toBeTruthy();
    expect(result.publicationCount).toBeGreaterThan(0);
  });

  it('should fetch publications for a variant', async () => {
    const pubs = await publications('rs328');

    expect(pubs.length).toBeGreaterThan(0);
    expect(pubs[0]!.pmid).toBeGreaterThan(0);
  });
});
