import { describe, expect, it } from 'vitest';
import { parseGeneInfoTsv } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseGeneInfoTsv (real data)', () => {
  const records = parseGeneInfoTsv(readFixture('gene_info.tsv'));

  it('should parse records from real gene info data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have numeric gene and tax IDs', () => {
    const first = records[0]!;

    expect(first.geneId).toBeGreaterThan(0);
    expect(first.taxId).toBeGreaterThan(0);
  });

  it('should have gene symbol and description', () => {
    const withSymbol = records.find((record) => record.symbol.length > 0);

    expect(withSymbol).toBeDefined();
    expect(withSymbol!.description.length).toBeGreaterThan(0);
  });

  it('should have gene type', () => {
    for (const record of records) {
      expect(record.type.length).toBeGreaterThan(0);
    }
  });

  it('should have arrays for multi-value fields', () => {
    const first = records[0]!;

    expect(Array.isArray(first.chromosomes)).toBe(true);
    expect(Array.isArray(first.synonyms)).toBe(true);
  });
});
