import { describe, expect, it } from 'vitest';
import { Cite } from '@ncbijs/cite';

const cite = new Cite();

describe('Citation Exporter E2E', () => {
  describe('cite single article', () => {
    it('should generate CSL JSON for a known PMID', async () => {
      const csl = await cite.cite('17284678', 'csl');

      expect(csl).toHaveProperty('type');
      expect(csl).toHaveProperty('title');
      expect(csl).toHaveProperty('author');
    });

    it('should generate RIS for a known PMID', async () => {
      const ris = await cite.cite('17284678', 'ris');

      expect(ris).toContain('TY  -');
    });

    it('should generate MEDLINE for a known PMID', async () => {
      const medline = await cite.cite('17284678', 'medline');

      expect(typeof medline).toBe('string');
      expect(medline.length).toBeGreaterThan(0);
    });
  });

  describe('citeMany', () => {
    it('should generate citations for multiple PMIDs', async () => {
      const results: Array<{ id: string; citation: string | unknown }> = [];

      for await (const entry of cite.citeMany(['17284678', '33856027'], 'ris')) {
        results.push(entry);
      }

      expect(results).toHaveLength(2);
    });
  });
});
