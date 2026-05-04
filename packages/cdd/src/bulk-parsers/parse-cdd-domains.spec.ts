import { describe, expect, it } from 'vitest';
import { parseCddDomains } from './parse-cdd-domains';

const SAMPLE_TSV = [
  '1234\tcd00001\tKH\tK homology domain\t70\tCdd',
  '5678\tsmart00001\tSH3\tSrc homology 3 domain\t56\tSMART',
  '9012\tpfam00001\t7tm_1\t7 transmembrane receptor\t265\tPfam',
].join('\n');

describe('parseCddDomains', () => {
  it('parses multiple rows', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts accession', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result[0]!.accession).toBe('cd00001');
    expect(result[1]!.accession).toBe('smart00001');
  });

  it('extracts shortName', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result[0]!.shortName).toBe('KH');
    expect(result[1]!.shortName).toBe('SH3');
  });

  it('extracts description', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result[0]!.description).toBe('K homology domain');
    expect(result[2]!.description).toBe('7 transmembrane receptor');
  });

  it('extracts pssmLength', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result[0]!.pssmLength).toBe(70);
    expect(result[2]!.pssmLength).toBe(265);
  });

  it('extracts database', () => {
    const result = parseCddDomains(SAMPLE_TSV);

    expect(result[0]!.database).toBe('Cdd');
    expect(result[1]!.database).toBe('SMART');
    expect(result[2]!.database).toBe('Pfam');
  });

  it('returns empty array for empty input', () => {
    expect(parseCddDomains('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parseCddDomains('  \n  \n  ')).toEqual([]);
  });

  it('skips comment lines', () => {
    const tsv = [
      '# PSSM-Id\tAccession\tShort name\tDescription\tPSSM-Length\tDatabase',
      SAMPLE_TSV,
    ].join('\n');
    const result = parseCddDomains(tsv);

    expect(result).toHaveLength(3);
  });

  it('skips rows with fewer than 6 fields', () => {
    const tsv = [
      '1234\tcd00001\tKH\tK homology domain\t70',
      '5678\tsmart00001\tSH3\tSrc homology 3 domain\t56\tSMART',
    ].join('\n');
    const result = parseCddDomains(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.accession).toBe('smart00001');
  });

  it('skips rows with empty accession', () => {
    const tsv = '1234\t\tKH\tK homology domain\t70\tCdd';
    const result = parseCddDomains(tsv);

    expect(result).toEqual([]);
  });

  it('handles non-numeric pssmLength as zero', () => {
    const tsv = '1234\tcd00001\tKH\tK homology domain\tabc\tCdd';
    const result = parseCddDomains(tsv);

    expect(result[0]!.pssmLength).toBe(0);
  });

  it('trims whitespace from fields', () => {
    const tsv = '  1234  \t  cd00001  \t  KH  \t  K homology  \t  70  \t  Cdd  ';
    const result = parseCddDomains(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.accession).toBe('cd00001');
    expect(result[0]!.shortName).toBe('KH');
    expect(result[0]!.description).toBe('K homology');
    expect(result[0]!.pssmLength).toBe(70);
    expect(result[0]!.database).toBe('Cdd');
  });

  it('handles trailing newline', () => {
    const tsv = '1234\tcd00001\tKH\tK homology domain\t70\tCdd\n';
    const result = parseCddDomains(tsv);

    expect(result).toHaveLength(1);
  });

  it('handles mixed valid and invalid rows', () => {
    const tsv = [
      '1234\tcd00001\tKH\tK homology domain\t70\tCdd',
      '',
      '# comment',
      '5678\t\tSH3\tSrc homology 3\t56\tSMART',
      '9012\tpfam00001\t7tm_1\t7 transmembrane\t265\tPfam',
    ].join('\n');
    const result = parseCddDomains(tsv);

    expect(result).toHaveLength(2);
    expect(result[0]!.accession).toBe('cd00001');
    expect(result[1]!.accession).toBe('pfam00001');
  });
});
