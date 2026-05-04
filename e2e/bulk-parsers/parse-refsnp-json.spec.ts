import { describe, expect, it } from 'vitest';
import { parseRefSnpJson } from '@ncbijs/snp';
import { readFixture } from './fixture-reader';

describe('parseRefSnpJson (real data)', () => {
  const report = parseRefSnpJson(readFixture('refsnp-sample.json'));

  it('should parse the RefSNP report', () => {
    expect(report.refsnpId.length).toBeGreaterThan(0);
  });

  it('should have a creation date', () => {
    expect(report.createDate.length).toBeGreaterThan(0);
  });

  it('should have placements', () => {
    expect(report.placements.length).toBeGreaterThan(0);

    const first = report.placements[0]!;

    expect(first.seqId.length).toBeGreaterThan(0);
  });

  it('should have placement alleles', () => {
    const withAlleles = report.placements.find((placement) => placement.alleles.length > 0);

    expect(withAlleles).toBeDefined();
  });

  it('should have allele annotations', () => {
    expect(report.alleleAnnotations.length).toBeGreaterThan(0);
  });
});
