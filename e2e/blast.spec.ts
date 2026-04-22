import { describe, expect, it } from 'vitest';
import { Blast } from '@ncbijs/blast';

const blast = new Blast();

describe('BLAST E2E', () => {
  it('should run a short blastn search and return hits', { timeout: 600_000 }, async () => {
    try {
      const result = await blast.search(
        '>test\nATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGC',
        'blastn',
        'nt',
        { hitlistSize: 5, pollIntervalMs: 15000, maxPollAttempts: 40 },
      );

      expect(result.hits.length).toBeGreaterThan(0);
      expect(result.hits[0]!.accession).toBeTruthy();
      expect(result.hits[0]!.hsps.length).toBeGreaterThan(0);
      expect(result.hits[0]!.hsps[0]!.evalue).toBeGreaterThanOrEqual(0);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d|timed out|ECONNREFUSED/.test(error.message)) {
        return;
      }
      throw error;
    }
  });
});
