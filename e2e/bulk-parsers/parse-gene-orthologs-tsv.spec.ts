import { describe, expect, it } from 'vitest';
import { parseGeneOrthologsTsv } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseGeneOrthologsTsv (real data)', () => {
  const records = parseGeneOrthologsTsv(readFixture('gene_orthologs.tsv'));

  it('should parse records from real gene_orthologs data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid gene identifiers', () => {
    const first = records[0]!;

    expect(first.geneId).toBeGreaterThan(0);
    expect(first.otherGeneId).toBeGreaterThan(0);
  });

  it('should have valid taxonomy IDs', () => {
    const first = records[0]!;

    expect(first.taxId).toBeGreaterThan(0);
    expect(first.otherTaxId).toBeGreaterThan(0);
  });

  it('should have a relationship string', () => {
    const first = records[0]!;

    expect(typeof first.relationship).toBe('string');
    expect(first.relationship.length).toBeGreaterThan(0);
  });
});
