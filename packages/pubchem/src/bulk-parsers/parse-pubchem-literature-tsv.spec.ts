import { describe, expect, it } from 'vitest';
import { parsePubchemLiteratureTsv } from './parse-pubchem-literature-tsv';

const SAMPLE_TSV = ['1\t12345\tchemical', '2\t67890\tpharmacological', '3\t11111\tchemical'].join(
  '\n',
);

describe('parsePubchemLiteratureTsv', () => {
  it('parses multiple rows', () => {
    const result = parsePubchemLiteratureTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts cid', () => {
    const result = parsePubchemLiteratureTsv(SAMPLE_TSV);

    expect(result[0]!.cid).toBe(1);
    expect(result[1]!.cid).toBe(2);
  });

  it('extracts pmid', () => {
    const result = parsePubchemLiteratureTsv(SAMPLE_TSV);

    expect(result[0]!.pmid).toBe(12345);
    expect(result[1]!.pmid).toBe(67890);
  });

  it('extracts type', () => {
    const result = parsePubchemLiteratureTsv(SAMPLE_TSV);

    expect(result[0]!.type).toBe('chemical');
    expect(result[1]!.type).toBe('pharmacological');
  });

  it('returns empty array for empty input', () => {
    expect(parsePubchemLiteratureTsv('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parsePubchemLiteratureTsv('  \n  \n  ')).toEqual([]);
  });

  it('skips comment lines', () => {
    const tsv = ['# CID\tPMID\tType', '1\t100\tchemical'].join('\n');
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.cid).toBe(1);
  });

  it('skips rows with fewer than 3 fields', () => {
    const tsv = ['1\t100', '2\t200\tchemical'].join('\n');
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.cid).toBe(2);
  });

  it('skips rows with zero cid', () => {
    const tsv = '0\t100\tchemical';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toEqual([]);
  });

  it('skips rows with zero pmid', () => {
    const tsv = '1\t0\tchemical';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toEqual([]);
  });

  it('skips rows with non-numeric cid', () => {
    const tsv = 'abc\t100\tchemical';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toEqual([]);
  });

  it('skips rows with non-numeric pmid', () => {
    const tsv = '1\tabc\tchemical';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toEqual([]);
  });

  it('trims whitespace from fields', () => {
    const tsv = '  1  \t  200  \t  chemical  ';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.cid).toBe(1);
    expect(result[0]!.pmid).toBe(200);
    expect(result[0]!.type).toBe('chemical');
  });

  it('handles trailing newline', () => {
    const tsv = '1\t100\tchemical\n';
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toHaveLength(1);
  });

  it('handles mixed valid and invalid rows', () => {
    const tsv = [
      '1\t100\tchemical',
      '0\t200\tpharmacological',
      '',
      '# comment',
      '3\t300\tchemical',
    ].join('\n');
    const result = parsePubchemLiteratureTsv(tsv);

    expect(result).toHaveLength(2);
    expect(result[0]!.cid).toBe(1);
    expect(result[1]!.cid).toBe(3);
  });
});
