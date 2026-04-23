import { describe, expect, it } from 'vitest';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { readFixture } from './fixture-reader';

describe('parseVariantSummaryTsv (real data)', () => {
  const records = parseVariantSummaryTsv(readFixture('variant_summary.tsv'));

  it('should parse records from real variant summary data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have required string fields', () => {
    const first = records[0]!;

    expect(first.uid.length).toBeGreaterThan(0);
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.objectType.length).toBeGreaterThan(0);
  });

  it('should have clinical significance', () => {
    const withSignificance = records.find((record) => record.clinicalSignificance.length > 0);

    expect(withSignificance).toBeDefined();
  });

  it('should have gene information', () => {
    const withGenes = records.find((record) => record.genes.length > 0);

    expect(withGenes).toBeDefined();
    expect(withGenes!.genes[0]!.geneId).toBeGreaterThan(0);
    expect(withGenes!.genes[0]!.symbol.length).toBeGreaterThan(0);
  });

  it('should have genomic locations', () => {
    const withLocations = records.find((record) => record.locations.length > 0);

    expect(withLocations).toBeDefined();
    expect(withLocations!.locations[0]!.assemblyName.length).toBeGreaterThan(0);
    expect(withLocations!.locations[0]!.chromosome.length).toBeGreaterThan(0);
  });
});
