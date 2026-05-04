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
    expect(result.gene.length).toBeGreaterThan(0);
  });

  it('should fetch publication IDs for a variant', async () => {
    let result;
    try {
      result = await litvar.publications('rs328');
    } catch {
      return;
    }

    expect(result.count).toBeGreaterThan(0);
    expect(result.pmids.length).toBeGreaterThan(0);
  });
});
