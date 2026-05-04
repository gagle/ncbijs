import { describe, expect, it } from 'vitest';
import { parseIciteCsv } from '@ncbijs/icite';
import { readFixture } from './fixture-reader';

describe('parseIciteCsv (real data)', () => {
  const records = parseIciteCsv(readFixture('icite-sample.csv'));

  it('should parse records from real iCite CSV data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid PMIDs', () => {
    for (const record of records) {
      expect(record.pmid).toBeGreaterThan(0);
    }
  });

  it('should have bibliographic fields', () => {
    const first = records[0]!;

    expect(first.year).toBeGreaterThan(2000);
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.journal.length).toBeGreaterThan(0);
  });

  it('should have citation metrics', () => {
    const first = records[0]!;

    expect(typeof first.citedByCount).toBe('number');
    expect(typeof first.referencesCount).toBe('number');
    expect(typeof first.isResearchArticle).toBe('boolean');
  });

  it('should have PMID arrays for citation links', () => {
    const withCitations = records.find((record) => record.citedByPmids.length > 0);

    expect(withCitations).toBeDefined();
    expect(withCitations!.citedByPmids[0]).toBeGreaterThan(0);
  });
});
