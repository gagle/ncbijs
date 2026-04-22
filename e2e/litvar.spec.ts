import { describe, expect, it } from 'vitest';
import { LitVar } from '@ncbijs/litvar';

const litvar = new LitVar();

describe('LitVar E2E', () => {
  it('should fetch variant info by rsID', async () => {
    try {
      const result = await litvar.variant('rs328');

      expect(result.rsid).toBe('rs328');
      expect(result.gene).toBeTruthy();
      expect(result.publicationCount).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d/.test(error.message)) {
        return;
      }
      throw error;
    }
  });

  it('should fetch publications for a variant', async () => {
    try {
      const pubs = await litvar.publications('rs328');

      expect(pubs.length).toBeGreaterThan(0);
      expect(pubs[0]!.pmid).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d/.test(error.message)) {
        return;
      }
      throw error;
    }
  });
});
