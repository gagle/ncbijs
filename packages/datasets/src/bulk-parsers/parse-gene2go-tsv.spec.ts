import { describe, expect, it } from 'vitest';
import { parseGene2GoTsv } from './parse-gene2go-tsv';

const HEADER = '#tax_id\tGeneID\tGO_ID\tEvidence\tQualifier\tGO_term\tPubMed\tCategory';

const ROW_BRCA2 = '9606\t675\tGO:0006281\tIDA\tinvolved_in\tDNA repair\t20301330|18451181\tProcess';

const ROW_TP53 = '9606\t7157\tGO:0005634\tIDA\tlocated_in\tnucleus\t26490173\tComponent';

const ROW_NO_PMID = '9606\t675\tGO:0005515\tIPI\tenables\tprotein binding\t-\tFunction';

const SAMPLE_TSV = [HEADER, ROW_BRCA2, ROW_TP53, ROW_NO_PMID].join('\n');

describe('parseGene2GoTsv', () => {
  it('parses all data rows', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts taxId', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.taxId).toBe(9606);
  });

  it('extracts geneId', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.geneId).toBe(675);
    expect(result[1]!.geneId).toBe(7157);
  });

  it('extracts GO ID', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.goId).toBe('GO:0006281');
    expect(result[1]!.goId).toBe('GO:0005634');
  });

  it('extracts GO term', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.goTerm).toBe('DNA repair');
    expect(result[1]!.goTerm).toBe('nucleus');
  });

  it('extracts evidence code', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.evidence).toBe('IDA');
    expect(result[2]!.evidence).toBe('IPI');
  });

  it('extracts qualifier', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.qualifier).toBe('involved_in');
    expect(result[1]!.qualifier).toBe('located_in');
    expect(result[2]!.qualifier).toBe('enables');
  });

  it('extracts category', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.category).toBe('Process');
    expect(result[1]!.category).toBe('Component');
    expect(result[2]!.category).toBe('Function');
  });

  it('parses pipe-delimited PMIDs', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[0]!.pmids).toEqual([20301330, 18451181]);
  });

  it('parses single PMID', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[1]!.pmids).toEqual([26490173]);
  });

  it('handles dash PubMed as empty array', () => {
    const result = parseGene2GoTsv(SAMPLE_TSV);

    expect(result[2]!.pmids).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(parseGene2GoTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseGene2GoTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'tax_id\tSomething\n9606\ttest';

    expect(parseGene2GoTsv(badHeader)).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const tsvWithBlanks = [HEADER, ROW_BRCA2, '', '# comment', ROW_TP53].join('\n');
    const result = parseGene2GoTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('handles header without hash prefix', () => {
    const noHash = HEADER.replace('#', '');
    const tsv = [noHash, ROW_BRCA2].join('\n');
    const result = parseGene2GoTsv(tsv);

    expect(result).toHaveLength(1);
    expect(result[0]!.goId).toBe('GO:0006281');
  });

  it('filters out non-numeric PMIDs', () => {
    const badPmid = ROW_BRCA2.replace('20301330|18451181', '20301330|abc');
    const tsv = [HEADER, badPmid].join('\n');
    const result = parseGene2GoTsv(tsv);

    expect(result[0]!.pmids).toEqual([20301330]);
  });
});
