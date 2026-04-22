import { describe, expect, it } from 'vitest';
import { parsePmcIdsCsv } from './parse-pmc-ids-csv';

const SAMPLE_CSV = [
  'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
  'Nat Biotechnol,1087-0156,1546-1696,2005,23,1,,10.1038/nbt0105-2,PMC1464427,15637587,,2005/01/28 00:00',
  'Am J Transplant,1600-6135,1600-6143,2005,5,4 Pt 1,,10.1111/j.1600-6143.2005.00755.x,PMC1475553,15816890,NIHMS6395,2006/05/11 00:00',
  'J Biol Chem,0021-9258,1083-351X,2005,280,7,,10.1074/jbc.M409962200,PMC1388207,15537636,,2006/02/15 00:00',
].join('\n');

describe('parsePmcIdsCsv', () => {
  it('parses all data rows', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result).toHaveLength(3);
  });

  it('extracts PMID as string or null', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[0].pmid).toBe('15637587');
    expect(result[1].pmid).toBe('15816890');
  });

  it('extracts PMCID', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[0].pmcid).toBe('PMC1464427');
  });

  it('extracts DOI', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[0].doi).toBe('10.1038/nbt0105-2');
  });

  it('maps empty fields to null', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[0].mid).toBeNull();
  });

  it('extracts Manuscript Id when present', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[1].mid).toBe('NIHMS6395');
  });

  it('extracts release date', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    expect(result[0].releaseDate).toBe('2005/01/28 00:00');
  });

  it('sets live to true for all records', () => {
    const result = parsePmcIdsCsv(SAMPLE_CSV);

    for (const record of result) {
      expect(record.live).toBe(true);
    }
  });

  it('returns empty array for empty input', () => {
    expect(parsePmcIdsCsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    const headerOnly =
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date';

    expect(parsePmcIdsCsv(headerOnly)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'Title,DOI\nSomething,10.1234/test';

    expect(parsePmcIdsCsv(badHeader)).toEqual([]);
  });

  it('skips blank lines', () => {
    const csvWithBlanks = [
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
      'Nat Biotechnol,1087-0156,1546-1696,2005,23,1,,10.1038/nbt0105-2,PMC1464427,15637587,,2005/01/28 00:00',
      '',
      '  ',
      'J Biol Chem,0021-9258,1083-351X,2005,280,7,,10.1074/jbc.M409962200,PMC1388207,15537636,,2006/02/15 00:00',
    ].join('\n');

    const result = parsePmcIdsCsv(csvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('handles quoted fields with commas', () => {
    const csvWithQuotes = [
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
      '"Int J Cancer, Prevention",1087-0156,,2005,23,1,,10.1038/test,PMC0000001,99999999,,2005/01/01 00:00',
    ].join('\n');

    const result = parsePmcIdsCsv(csvWithQuotes);

    expect(result).toHaveLength(1);
    expect(result[0].pmcid).toBe('PMC0000001');
  });

  it('handles escaped double quotes in fields', () => {
    const csvWithEscapedQuotes = [
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
      '"Title with ""quotes""",1087-0156,,2005,23,1,,10.1038/test,PMC0000002,88888888,,2005/01/01 00:00',
    ].join('\n');

    const result = parsePmcIdsCsv(csvWithEscapedQuotes);

    expect(result).toHaveLength(1);
    expect(result[0].pmid).toBe('88888888');
  });

  it('handles missing DOI column gracefully', () => {
    const noDoi = [
      'Journal Title,ISSN,PMCID,PMID,Release Date',
      'Nat Biotechnol,1087-0156,PMC1464427,15637587,2005/01/28 00:00',
    ].join('\n');

    const result = parsePmcIdsCsv(noDoi);

    expect(result).toHaveLength(1);
    expect(result[0].doi).toBeNull();
    expect(result[0].mid).toBeNull();
    expect(result[0].pmcid).toBe('PMC1464427');
    expect(result[0].pmid).toBe('15637587');
  });

  it('handles rows with fewer fields than header', () => {
    const shortRow = [
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
      'Short,,,,,,,,PMC0000003,77777777',
    ].join('\n');

    const result = parsePmcIdsCsv(shortRow);

    expect(result).toHaveLength(1);
    expect(result[0].pmcid).toBe('PMC0000003');
    expect(result[0].pmid).toBe('77777777');
    expect(result[0].mid).toBeNull();
    expect(result[0].releaseDate).toBe('');
  });

  it('trims whitespace from field values', () => {
    const csvWithSpaces = [
      'Journal Title,ISSN,eISSN,Year,Volume,Issue,Page,DOI,PMCID,PMID,Manuscript Id,Release Date',
      'Nat Biotechnol, 1087-0156 ,,2005,23,1,,10.1038/test, PMC0000004 , 66666666 ,,2005/01/01 00:00',
    ].join('\n');

    const result = parsePmcIdsCsv(csvWithSpaces);

    expect(result[0].pmcid).toBe('PMC0000004');
    expect(result[0].pmid).toBe('66666666');
  });
});
