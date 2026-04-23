import { describe, expect, it } from 'vitest';
import { parseDbSnpVcf } from '@ncbijs/snp';
import { readFixture } from './fixture-reader';

describe('parseDbSnpVcf (real data)', () => {
  const records = parseDbSnpVcf(readFixture('dbsnp-sample.vcf'));

  it('should parse records from real dbSNP VCF data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have chromosome and position', () => {
    const first = records[0]!;

    expect(first.chrom.length).toBeGreaterThan(0);
    expect(first.pos).toBeGreaterThan(0);
  });

  it('should have RS IDs', () => {
    for (const record of records) {
      expect(record.rsId).toMatch(/^rs\d+$/);
    }
  });

  it('should have ref alleles', () => {
    const first = records[0]!;

    expect(first.ref.length).toBeGreaterThan(0);
  });

  it('should have alt alleles as an array', () => {
    const first = records[0]!;

    expect(Array.isArray(first.alt)).toBe(true);
  });

  it('should have variant class from INFO field', () => {
    const withVc = records.find((record) => record.variantClass.length > 0);

    expect(withVc).toBeDefined();
  });
});
