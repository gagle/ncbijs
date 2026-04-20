import { describe, expect, it } from 'vitest';
import { Snp } from '@ncbijs/snp';

const snp = new Snp();

describe('SNP Variation Services E2E', () => {
  it('should retrieve rs7412 (APOE variant)', async () => {
    const report = await snp.refsnp(7412);

    expect(report.refsnpId).toBe('7412');
    expect(report.placements.length).toBeGreaterThan(0);
    expect(report.alleleAnnotations.length).toBeGreaterThan(0);
  });

  it('should retrieve multiple SNPs in batch', async () => {
    const reports = await snp.refsnpBatch([7412, 429358]);

    expect(reports).toHaveLength(2);
    expect(reports[0]!.refsnpId).toBe('7412');
    expect(reports[1]!.refsnpId).toBe('429358');
  });
});
