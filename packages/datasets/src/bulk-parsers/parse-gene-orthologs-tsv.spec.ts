import { describe, expect, it } from 'vitest';
import { parseGeneOrthologsTsv } from './parse-gene-orthologs-tsv';

const HEADER = '#tax_id\tGeneID\trelationship\tOther_tax_id\tOther_GeneID';

const ROW_BRCA2_MOUSE = '9606\t675\tOrtholog\t10090\t12190';
const ROW_TP53_MOUSE = '9606\t7157\tOrtholog\t10090\t22059';
const ROW_BRCA2_RAT = '9606\t675\tOrtholog\t10116\t360254';

const SAMPLE_TSV = [HEADER, ROW_BRCA2_MOUSE, ROW_TP53_MOUSE, ROW_BRCA2_RAT].join('\n');

describe('parseGeneOrthologsTsv', () => {
  it('parses all data rows', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts taxId', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result[0]!.taxId).toBe(9606);
  });

  it('extracts geneId', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result[0]!.geneId).toBe(675);
    expect(result[1]!.geneId).toBe(7157);
  });

  it('extracts relationship', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result[0]!.relationship).toBe('Ortholog');
  });

  it('extracts otherTaxId', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result[0]!.otherTaxId).toBe(10090);
    expect(result[2]!.otherTaxId).toBe(10116);
  });

  it('extracts otherGeneId', () => {
    const result = parseGeneOrthologsTsv(SAMPLE_TSV);

    expect(result[0]!.otherGeneId).toBe(12190);
    expect(result[1]!.otherGeneId).toBe(22059);
  });

  it('returns empty array for empty input', () => {
    expect(parseGeneOrthologsTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseGeneOrthologsTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'tax_id\tSomething\n9606\ttest';

    expect(parseGeneOrthologsTsv(badHeader)).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const tsvWithBlanks = [HEADER, ROW_BRCA2_MOUSE, '', '# comment', ROW_TP53_MOUSE].join('\n');
    const result = parseGeneOrthologsTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('skips rows with zero geneId', () => {
    const badRow = '9606\t0\tOrtholog\t10090\t12190';
    const tsv = [HEADER, badRow].join('\n');

    expect(parseGeneOrthologsTsv(tsv)).toEqual([]);
  });

  it('skips rows with zero otherGeneId', () => {
    const badRow = '9606\t675\tOrtholog\t10090\t0';
    const tsv = [HEADER, badRow].join('\n');

    expect(parseGeneOrthologsTsv(tsv)).toEqual([]);
  });

  it('handles header without hash prefix', () => {
    const noHash = HEADER.replace('#', '');
    const tsv = [noHash, ROW_BRCA2_MOUSE].join('\n');
    const result = parseGeneOrthologsTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.geneId).toBe(675);
  });
});
