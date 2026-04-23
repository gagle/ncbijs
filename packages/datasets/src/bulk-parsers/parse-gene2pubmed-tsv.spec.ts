import { describe, expect, it } from 'vitest';
import { parseGene2PubmedTsv } from './parse-gene2pubmed-tsv';

const HEADER = '#tax_id\tGeneID\tPubMed_ID';

const ROW_BRCA2 = '9606\t675\t20301330';
const ROW_TP53 = '9606\t7157\t26490173';
const ROW_MOUSE = '10090\t11287\t1234567';

const SAMPLE_TSV = [HEADER, ROW_BRCA2, ROW_TP53, ROW_MOUSE].join('\n');

describe('parseGene2PubmedTsv', () => {
  it('parses all data rows', () => {
    const result = parseGene2PubmedTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts taxId', () => {
    const result = parseGene2PubmedTsv(SAMPLE_TSV);

    expect(result[0]!.taxId).toBe(9606);
    expect(result[2]!.taxId).toBe(10090);
  });

  it('extracts geneId', () => {
    const result = parseGene2PubmedTsv(SAMPLE_TSV);

    expect(result[0]!.geneId).toBe(675);
    expect(result[1]!.geneId).toBe(7157);
  });

  it('extracts pmid', () => {
    const result = parseGene2PubmedTsv(SAMPLE_TSV);

    expect(result[0]!.pmid).toBe(20301330);
    expect(result[1]!.pmid).toBe(26490173);
  });

  it('returns empty array for empty input', () => {
    expect(parseGene2PubmedTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseGene2PubmedTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'tax_id\tSomething\n9606\ttest';

    expect(parseGene2PubmedTsv(badHeader)).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const tsvWithBlanks = [HEADER, ROW_BRCA2, '', '# comment', ROW_TP53].join('\n');
    const result = parseGene2PubmedTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('skips rows with zero geneId', () => {
    const badRow = '9606\t0\t20301330';
    const tsv = [HEADER, badRow].join('\n');

    expect(parseGene2PubmedTsv(tsv)).toEqual([]);
  });

  it('skips rows with zero pmid', () => {
    const badRow = '9606\t675\t0';
    const tsv = [HEADER, badRow].join('\n');

    expect(parseGene2PubmedTsv(tsv)).toEqual([]);
  });

  it('skips rows with non-numeric geneId', () => {
    const badRow = '9606\tabc\t20301330';
    const tsv = [HEADER, badRow].join('\n');

    expect(parseGene2PubmedTsv(tsv)).toEqual([]);
  });

  it('handles header without hash prefix', () => {
    const noHash = HEADER.replace('#', '');
    const tsv = [noHash, ROW_BRCA2].join('\n');
    const result = parseGene2PubmedTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.geneId).toBe(675);
  });
});
