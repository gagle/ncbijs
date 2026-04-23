import { describe, expect, it } from 'vitest';
import { parseIciteCsv } from './parse-icite-csv';

const HEADER =
  'pmid,year,title,authors,journal,is_research_article,relative_citation_ratio,nih_percentile,citation_count,references_count,expected_citations_per_year,field_citation_rate,citations_per_year,is_clinical,provisional,human,animal,molecular_cellular,apt,cited_by,references,doi';

const ROW_BASIC =
  '20301330,2010,A BRCA2 study,Smith J,Nature,true,3.14,85.2,42,18,2.1,4.5,3.5,false,false,0.8,0.1,0.1,0.65,12345 67890,11111 22222,10.1038/nature09876';

const ROW_MISSING_METRICS =
  '26490173,2015,A TP53 study,Doe J,Science,false,,,,5,,,,true,true,0.5,0.3,0.2,0.45,,,10.1126/science.abc123';

const SAMPLE_CSV = [HEADER, ROW_BASIC, ROW_MISSING_METRICS].join('\n');

describe('parseIciteCsv', () => {
  it('parses all data rows', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result).toHaveLength(2);
  });

  it('extracts pmid', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.pmid).toBe(20301330);
    expect(result[1]!.pmid).toBe(26490173);
  });

  it('extracts year', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.year).toBe(2010);
  });

  it('extracts title', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.title).toBe('A BRCA2 study');
  });

  it('extracts authors', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.authors).toBe('Smith J');
  });

  it('extracts journal', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.journal).toBe('Nature');
  });

  it('extracts isResearchArticle', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.isResearchArticle).toBe(true);
    expect(result[1]!.isResearchArticle).toBe(false);
  });

  it('extracts numeric citation metrics', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.relativeCitationRatio).toBeCloseTo(3.14);
    expect(result[0]!.nihPercentile).toBeCloseTo(85.2);
    expect(result[0]!.citedByCount).toBe(42);
    expect(result[0]!.referencesCount).toBe(18);
  });

  it('extracts optional float metrics', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.expectedCitationsPerYear).toBeCloseTo(2.1);
    expect(result[0]!.fieldCitationRate).toBeCloseTo(4.5);
    expect(result[0]!.citationsPerYear).toBeCloseTo(3.5);
  });

  it('returns undefined for missing optional metrics', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[1]!.relativeCitationRatio).toBeUndefined();
    expect(result[1]!.nihPercentile).toBeUndefined();
    expect(result[1]!.expectedCitationsPerYear).toBeUndefined();
    expect(result[1]!.fieldCitationRate).toBeUndefined();
    expect(result[1]!.citationsPerYear).toBeUndefined();
  });

  it('extracts boolean flags', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.isClinicallyCited).toBe(false);
    expect(result[0]!.provisional).toBe(false);
    expect(result[1]!.isClinicallyCited).toBe(true);
    expect(result[1]!.provisional).toBe(true);
  });

  it('extracts research classification percentages', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.human).toBeCloseTo(0.8);
    expect(result[0]!.animal).toBeCloseTo(0.1);
    expect(result[0]!.molecularCellular).toBeCloseTo(0.1);
    expect(result[0]!.apt).toBeCloseTo(0.65);
  });

  it('parses space-delimited cited_by PMIDs', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.citedByPmids).toEqual([12345, 67890]);
  });

  it('parses space-delimited references PMIDs', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.referencesPmids).toEqual([11111, 22222]);
  });

  it('handles empty cited_by and references as empty arrays', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[1]!.citedByPmids).toEqual([]);
    expect(result[1]!.referencesPmids).toEqual([]);
  });

  it('extracts DOI', () => {
    const result = parseIciteCsv(SAMPLE_CSV);

    expect(result[0]!.doi).toBe('10.1038/nature09876');
  });

  it('returns empty array for empty input', () => {
    expect(parseIciteCsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseIciteCsv(HEADER)).toEqual([]);
  });

  it('returns empty array when pmid column is missing', () => {
    const badHeader = 'year,title,journal\n2010,Test,Nature';

    expect(parseIciteCsv(badHeader)).toEqual([]);
  });

  it('skips blank lines', () => {
    const csvWithBlanks = [HEADER, ROW_BASIC, '', ROW_MISSING_METRICS].join('\n');
    const result = parseIciteCsv(csvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('handles quoted fields with commas', () => {
    const quotedTitle =
      '99999,2020,"A title, with commas",Auth A,Journal,true,1.0,50.0,10,5,1.0,2.0,1.5,false,false,0.5,0.3,0.2,0.4,,,10.1000/test';
    const csv = [HEADER, quotedTitle].join('\n');
    const result = parseIciteCsv(csv);

    expect(result[0]!.title).toBe('A title, with commas');
  });

  it('handles escaped double quotes in quoted fields', () => {
    const escapedQuotes =
      '99999,2020,"A ""quoted"" title",Auth A,Journal,true,1.0,50.0,10,5,1.0,2.0,1.5,false,false,0.5,0.3,0.2,0.4,,,10.1000/test';
    const csv = [HEADER, escapedQuotes].join('\n');
    const result = parseIciteCsv(csv);

    expect(result[0]!.title).toBe('A "quoted" title');
  });

  it('parses boolean from "1" value', () => {
    const row = '99999,2020,Test,Auth,Journal,1,,,0,0,,,,1,0,0,0,0,0,,,';
    const csv = [HEADER, row].join('\n');
    const result = parseIciteCsv(csv);

    expect(result[0]!.isResearchArticle).toBe(true);
    expect(result[0]!.isClinicallyCited).toBe(true);
    expect(result[0]!.provisional).toBe(false);
  });
});
