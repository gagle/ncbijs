import { describe, expect, it } from 'vitest';
import { parseDbSnpVcf } from './parse-dbsnp-vcf';

const META_LINES = [
  '##fileformat=VCFv4.1',
  '##INFO=<ID=RS,Number=1,Type=Integer,Description="dbSNP ID">',
  '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO',
].join('\n');

const ROW_SNV =
  '1\t10019\trs775809821\tTA\tT\t.\t.\tRS=775809821;dbSNPBuildID=144;SSR=0;VC=DIV;GNO;GENEINFO=DDX11L1:100287102';

const ROW_MULTI_ALT =
  '1\t10039\trs978760828\tA\tC,T\t.\t.\tRS=978760828;dbSNPBuildID=150;VC=SNV;GENEINFO=DDX11L1:100287102';

const ROW_MINIMAL = '22\t16050075\trs587697622\tA\tG\t.\t.\tRS=587697622;dbSNPBuildID=142;VC=SNV';

const SAMPLE_VCF = [META_LINES, ROW_SNV, ROW_MULTI_ALT, ROW_MINIMAL].join('\n');

describe('parseDbSnpVcf', () => {
  it('parses data rows and skips meta lines', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result).toHaveLength(3);
  });

  it('extracts chromosome', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.chrom).toBe('1');
    expect(result[2]!.chrom).toBe('22');
  });

  it('extracts position', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.pos).toBe(10019);
  });

  it('extracts rsId', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.rsId).toBe('rs775809821');
    expect(result[1]!.rsId).toBe('rs978760828');
  });

  it('extracts ref allele', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.ref).toBe('TA');
    expect(result[1]!.ref).toBe('A');
  });

  it('splits multi-allelic alt into array', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[1]!.alt).toEqual(['C', 'T']);
  });

  it('extracts single alt as array', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.alt).toEqual(['T']);
  });

  it('extracts GENEINFO', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.geneInfo).toBe('DDX11L1:100287102');
  });

  it('extracts VC as variantClass', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.variantClass).toBe('DIV');
    expect(result[1]!.variantClass).toBe('SNV');
  });

  it('extracts dbSNPBuildID', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[0]!.dbSnpBuildId).toBe(144);
    expect(result[1]!.dbSnpBuildId).toBe(150);
  });

  it('handles missing GENEINFO as empty string', () => {
    const result = parseDbSnpVcf(SAMPLE_VCF);

    expect(result[2]!.geneInfo).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(parseDbSnpVcf('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseDbSnpVcf(META_LINES)).toEqual([]);
  });

  it('skips rows with fewer than 8 fields', () => {
    const shortRow = '1\t100\t.\tA\tG\t.\t.';
    const vcf = [META_LINES, shortRow].join('\n');

    expect(parseDbSnpVcf(vcf)).toEqual([]);
  });

  it('handles dot alt as empty array', () => {
    const dotAlt = '1\t100\trs1\tA\t.\t.\t.\tVC=SNV';
    const vcf = [META_LINES, dotAlt].join('\n');
    const result = parseDbSnpVcf(vcf);

    expect(result[0]!.alt).toEqual([]);
  });

  it('handles dot INFO as empty fields', () => {
    const dotInfo = '1\t100\trs1\tA\tG\t.\t.\t.';
    const vcf = [META_LINES, dotInfo].join('\n');
    const result = parseDbSnpVcf(vcf);

    expect(result[0]!.geneInfo).toBe('');
    expect(result[0]!.variantClass).toBe('');
    expect(result[0]!.dbSnpBuildId).toBe(0);
  });
});
