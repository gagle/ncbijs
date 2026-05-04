import { describe, expect, it } from 'vitest';
import { parseGeneHistoryTsv } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseGeneHistoryTsv (real data)', () => {
  const records = parseGeneHistoryTsv(readFixture('gene_history.tsv'));

  it('should parse records from real gene_history data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid taxonomy and gene IDs', () => {
    const first = records[0]!;

    expect(first.taxId).toBeGreaterThan(0);
    expect(typeof first.geneId).toBe('number');
  });

  it('should have discontinued gene information', () => {
    const first = records[0]!;

    expect(typeof first.discontinuedGeneId).toBe('number');
    expect(typeof first.discontinuedSymbol).toBe('string');
    expect(typeof first.discontinueDate).toBe('string');
  });
});
