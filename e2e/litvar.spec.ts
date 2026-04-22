import { describe, expect, it } from 'vitest';
import { LitVar } from '@ncbijs/litvar';

const litvar = new LitVar();

describe('LitVar E2E', () => {
  it('should fetch variant info by rsID', async () => {
    const result = await litvar.variant('rs328');

    expect(result.rsid).toBe('rs328');
    expect(result.gene).toBeTruthy();
    expect(result.publicationCount).toBeGreaterThan(0);
  });

  it('should fetch publications for a variant', async () => {
    const pubs = await litvar.publications('rs328');

    expect(pubs.length).toBeGreaterThan(0);
    expect(pubs[0]!.pmid).toBeGreaterThan(0);
  });
});
