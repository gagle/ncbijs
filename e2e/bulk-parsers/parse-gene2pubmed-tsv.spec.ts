import { describe, expect, it } from 'vitest';
import { parseGene2PubmedTsv } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseGene2PubmedTsv (real data)', () => {
  const records = parseGene2PubmedTsv(readFixture('gene2pubmed.tsv'));

  it('should parse records from real gene2pubmed data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid numeric fields', () => {
    const first = records[0]!;

    expect(first.taxId).toBeGreaterThan(0);
    expect(first.geneId).toBeGreaterThan(0);
    expect(first.pmid).toBeGreaterThan(0);
  });

  it('should have all fields as numbers', () => {
    for (const record of records) {
      expect(typeof record.taxId).toBe('number');
      expect(typeof record.geneId).toBe('number');
      expect(typeof record.pmid).toBe('number');
    }
  });
});
