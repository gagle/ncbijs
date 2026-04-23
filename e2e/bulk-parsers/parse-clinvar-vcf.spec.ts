import { describe, expect, it } from 'vitest';
import { parseClinVarVcf } from '@ncbijs/clinvar';
import { readFixture } from './fixture-reader';

describe('parseClinVarVcf (real data)', () => {
  const records = parseClinVarVcf(readFixture('clinvar-sample.vcf'));

  it('should parse records from real ClinVar VCF data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have chromosome and position', () => {
    const first = records[0]!;

    expect(first.chrom.length).toBeGreaterThan(0);
    expect(first.pos).toBeGreaterThan(0);
  });

  it('should have ref and alt alleles', () => {
    const first = records[0]!;

    expect(first.ref.length).toBeGreaterThan(0);
    expect(first.alt.length).toBeGreaterThan(0);
  });

  it('should have clinical significance from INFO field', () => {
    const withClnsig = records.find((record) => record.clinicalSignificance.length > 0);

    expect(withClnsig).toBeDefined();
  });

  it('should have gene info from INFO field', () => {
    const withGene = records.find((record) => record.geneInfo.length > 0);

    expect(withGene).toBeDefined();
    expect(withGene!.geneInfo).toContain(':');
  });

  it('should have variant class from INFO field', () => {
    const withVc = records.find((record) => record.variantClass.length > 0);

    expect(withVc).toBeDefined();
  });
});
