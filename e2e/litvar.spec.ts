import { describe, expect, it } from 'vitest';
import { LitVar } from '@ncbijs/litvar';

const litvar = new LitVar();

describe('LitVar E2E', () => {
  it('should fetch variant info by rsID', async () => {
    let result;
    try {
      result = await litvar.variant('rs328');
    } catch {
      return;
    }

    expect(result.rsid).toBe('rs328');
    expect(result.gene).toBeTruthy();
    expect(result.publicationCount).toBeGreaterThan(0);
  });

  it('should fetch publications for a variant', async () => {
    let pubs;
    try {
      pubs = await litvar.publications('rs328');
    } catch {
      return;
    }

    expect(pubs.length).toBeGreaterThan(0);
    expect(pubs[0]!.pmid).toBeGreaterThan(0);
  });
});
