import { describe, expect, it } from 'vitest';
import { parseClinVarVcf } from './parse-clinvar-vcf';

const META_LINES = [
  '##fileformat=VCFv4.1',
  '##INFO=<ID=CLNSIG,Number=.,Type=String,Description="Clinical significance">',
  '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO',
].join('\n');

const ROW_PATHOGENIC =
  '1\t925952\t1019397\tG\tA\t.\t.\tAF_ESP=0.00546;ALLELEID=1003021;CLNDISDB=MedGen:CN517202;CLNDN=not_provided;CLNHGVS=NC_000001.11:g.925952G>A;CLNREVSTAT=criteria_provided%2C_single_submitter;CLNSIG=Likely_benign;CLNVC=single_nucleotide_variant;GENEINFO=SAMD11:148398;RS=1640863258';

const ROW_BENIGN =
  '13\t32315086\t37637\tG\tA\t.\t.\tCLNSIG=Benign;CLNDN=Hereditary_breast_and_ovarian_cancer%2C_BRCA2;CLNVC=single_nucleotide_variant;GENEINFO=BRCA2:675;RS=80359550';

const SAMPLE_VCF = [META_LINES, ROW_PATHOGENIC, ROW_BENIGN].join('\n');

describe('parseClinVarVcf', () => {
  it('parses data rows and skips meta lines', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result).toHaveLength(2);
  });

  it('extracts chromosome', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.chrom).toBe('1');
    expect(result[1]!.chrom).toBe('13');
  });

  it('extracts position', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.pos).toBe(925952);
    expect(result[1]!.pos).toBe(32315086);
  });

  it('extracts variant ID', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.id).toBe('1019397');
    expect(result[1]!.id).toBe('37637');
  });

  it('extracts ref and alt alleles', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.ref).toBe('G');
    expect(result[0]!.alt).toBe('A');
  });

  it('extracts CLNSIG as clinicalSignificance', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.clinicalSignificance).toBe('Likely_benign');
    expect(result[1]!.clinicalSignificance).toBe('Benign');
  });

  it('decodes percent-encoded CLNDN as diseaseNames', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[1]!.diseaseNames).toBe('Hereditary_breast_and_ovarian_cancer,_BRCA2');
  });

  it('extracts GENEINFO', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.geneInfo).toBe('SAMD11:148398');
    expect(result[1]!.geneInfo).toBe('BRCA2:675');
  });

  it('extracts RS number', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.rsId).toBe('1640863258');
    expect(result[1]!.rsId).toBe('80359550');
  });

  it('extracts CLNVC as variantClass', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.variantClass).toBe('single_nucleotide_variant');
  });

  it('handles qual and filter dot values', () => {
    const result = parseClinVarVcf(SAMPLE_VCF);

    expect(result[0]!.qual).toBe('.');
    expect(result[0]!.filter).toBe('.');
  });

  it('returns empty array for empty input', () => {
    expect(parseClinVarVcf('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseClinVarVcf(META_LINES)).toEqual([]);
  });

  it('skips rows with fewer than 8 fields', () => {
    const shortRow = '1\t100\t.\tA\tG\t.\t.';
    const vcf = [META_LINES, shortRow].join('\n');

    expect(parseClinVarVcf(vcf)).toEqual([]);
  });

  it('handles missing INFO keys as empty strings', () => {
    const minimalInfo = '1\t100\t.\tA\tG\t.\t.\t.';
    const vcf = [META_LINES, minimalInfo].join('\n');
    const result = parseClinVarVcf(vcf);

    expect(result[0]!.clinicalSignificance).toBe('');
    expect(result[0]!.diseaseNames).toBe('');
    expect(result[0]!.geneInfo).toBe('');
    expect(result[0]!.rsId).toBe('');
  });

  it('handles INFO flags without values', () => {
    const flagInfo = '1\t100\t.\tA\tG\t.\t.\tFLAG;CLNSIG=Pathogenic';
    const vcf = [META_LINES, flagInfo].join('\n');
    const result = parseClinVarVcf(vcf);

    expect(result[0]!.clinicalSignificance).toBe('Pathogenic');
  });

  it('decodes percent-encoded semicolons and equals signs', () => {
    const encodedInfo = '1\t100\t.\tA\tG\t.\t.\tCLNDN=A%3BB%3DC%25D';
    const vcf = [META_LINES, encodedInfo].join('\n');
    const result = parseClinVarVcf(vcf);

    expect(result[0]!.diseaseNames).toBe('A;B=C%D');
  });
});
