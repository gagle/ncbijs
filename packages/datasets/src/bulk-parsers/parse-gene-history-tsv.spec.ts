import { describe, expect, it } from 'vitest';
import { parseGeneHistoryTsv } from './parse-gene-history-tsv';

const HEADER = '#tax_id\tGeneID\tDiscontinued_GeneID\tDiscontinued_Symbol\tDiscontinue_Date';

const ROW_REPLACED = '9606\t675\t100\tOLDBRCA\t20200101';
const ROW_DISCONTINUED = '9606\t-\t200\tDEPR1\t20210315';
const ROW_MOUSE = '10090\t12190\t300\tOldBrca2\t20190601';

const SAMPLE_TSV = [HEADER, ROW_REPLACED, ROW_DISCONTINUED, ROW_MOUSE].join('\n');

describe('parseGeneHistoryTsv', () => {
  it('parses all data rows', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts taxId', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[0]!.taxId).toBe(9606);
    expect(result[2]!.taxId).toBe(10090);
  });

  it('extracts geneId for replaced genes', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[0]!.geneId).toBe(675);
  });

  it('treats dash geneId as zero for discontinued genes', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[1]!.geneId).toBe(0);
  });

  it('extracts discontinuedGeneId', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[0]!.discontinuedGeneId).toBe(100);
    expect(result[1]!.discontinuedGeneId).toBe(200);
  });

  it('extracts discontinuedSymbol', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[0]!.discontinuedSymbol).toBe('OLDBRCA');
    expect(result[1]!.discontinuedSymbol).toBe('DEPR1');
  });

  it('extracts discontinueDate', () => {
    const result = parseGeneHistoryTsv(SAMPLE_TSV);

    expect(result[0]!.discontinueDate).toBe('20200101');
    expect(result[1]!.discontinueDate).toBe('20210315');
  });

  it('returns empty array for empty input', () => {
    expect(parseGeneHistoryTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseGeneHistoryTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'tax_id\tSomething\n9606\ttest';

    expect(parseGeneHistoryTsv(badHeader)).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const tsvWithBlanks = [HEADER, ROW_REPLACED, '', '# comment', ROW_MOUSE].join('\n');
    const result = parseGeneHistoryTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('handles header without hash prefix', () => {
    const noHash = HEADER.replace('#', '');
    const tsv = [noHash, ROW_REPLACED].join('\n');
    const result = parseGeneHistoryTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.discontinuedGeneId).toBe(100);
  });

  it('handles dash discontinueDate as empty string', () => {
    const noDate = ROW_REPLACED.replace('20200101', '-');
    const tsv = [HEADER, noDate].join('\n');
    const result = parseGeneHistoryTsv(tsv);

    expect(result[0]!.discontinueDate).toBe('');
  });
});
