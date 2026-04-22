import { describe, expect, it } from 'vitest';
import { Protein } from '@ncbijs/protein';

const protein = new Protein({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('Protein E2E', () => {
  it('should fetch a protein FASTA record', async () => {
    const record = await protein.fetchFasta('NP_000537.3');

    expect(record.id).toContain('NP_000537');
    expect(record.description).toContain('p53');
    expect(record.sequence.length).toBeGreaterThan(50);
  });

  it('should fetch multiple protein FASTA records', async () => {
    const records = await protein.fetchFastaBatch(['NP_000537.3', 'NP_009225.1']);

    expect(records).toHaveLength(2);
    expect(records[0]!.id).toContain('NP_000537');
    expect(records[1]!.id).toContain('NP_009225');
  });

  it('should fetch a protein GenBank record', async () => {
    const record = await protein.fetchGenBank('NP_000537');

    expect(record.accession).toBe('NP_000537');
    expect(record.definition).toContain('p53');
    expect(record.locus.moleculeType).toBe('aa');
    expect(record.organism).toBe('Homo sapiens');
    expect(record.features.length).toBeGreaterThan(0);
    expect(record.sequence.length).toBeGreaterThan(50);
  });

  it('should fetch multiple protein GenBank records', async () => {
    const records = await protein.fetchGenBankBatch(['NP_000537', 'NP_009225']);

    expect(records).toHaveLength(2);
    expect(records[0]!.accession).toBe('NP_000537');
    expect(records[1]!.accession).toBe('NP_009225');
  });
});
