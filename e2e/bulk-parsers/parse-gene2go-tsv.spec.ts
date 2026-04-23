import { describe, expect, it } from 'vitest';
import { parseGene2GoTsv } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseGene2GoTsv (real data)', () => {
  const records = parseGene2GoTsv(readFixture('gene2go.tsv'));

  it('should parse records from real gene2go data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid gene and GO identifiers', () => {
    const first = records[0]!;

    expect(first.geneId).toBeGreaterThan(0);
    expect(first.goId).toMatch(/^GO:\d+$/);
  });

  it('should have string fields populated', () => {
    const first = records[0]!;

    expect(typeof first.goTerm).toBe('string');
    expect(typeof first.evidence).toBe('string');
    expect(typeof first.category).toBe('string');
  });

  it('should have pmids as an array of numbers', () => {
    for (const record of records) {
      expect(Array.isArray(record.pmids)).toBe(true);

      for (const pmid of record.pmids) {
        expect(typeof pmid).toBe('number');
      }
    }
  });
});
