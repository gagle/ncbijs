import { describe, expect, it } from 'vitest';
import { convert } from '@ncbijs/id-converter';

describe('ID Converter E2E', () => {
  describe('convert known IDs', () => {
    it('should convert a known PMID to PMCID and DOI', async () => {
      const results = await convert(['17284678']);

      expect(results).toHaveLength(1);
      expect(results[0]?.pmcid).toBeTruthy();
      expect(results[0]?.doi).toBeTruthy();
    });

    it('should convert a known PMCID to PMID and DOI', async () => {
      const results = await convert(['PMC3531190']);

      expect(results).toHaveLength(1);
      expect(results[0]?.pmid).toBeTruthy();
      expect(results[0]?.doi).toBeTruthy();
    });

    it('should convert a known DOI to PMID', async () => {
      const results = await convert(['10.1093/brain/awab148']);

      expect(results).toHaveLength(1);
      expect(results[0]?.pmid).toBeTruthy();
    });
  });

  describe('batch conversion', () => {
    it('should convert multiple PMIDs in single request', async () => {
      const results = await convert(['17284678', '33856027']);

      expect(results).toHaveLength(2);
    });
  });

  describe('versioned PMCIDs', () => {
    it('should return version information when requested', async () => {
      const results = await convert(['PMC3531190'], { versions: true });

      expect(results).toHaveLength(1);
      expect(results[0]?.versions).toBeDefined();
      expect(Array.isArray(results[0]?.versions)).toBe(true);
    });
  });
});
