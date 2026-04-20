import { describe, expect, it } from 'vitest';
import { Nucleotide } from '@ncbijs/nucleotide';

const nucleotide = new Nucleotide({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('Nucleotide E2E', () => {
  it('should fetch a nucleotide FASTA record', async () => {
    const record = await nucleotide.fetchFasta('NM_007294.4');

    expect(record.id).toContain('NM_007294');
    expect(record.description).toContain('BRCA1');
    expect(record.sequence.length).toBeGreaterThan(100);
    expect(record.sequence).toMatch(/^[ATCGN]+$/i);
  });

  it('should fetch multiple nucleotide FASTA records', async () => {
    const records = await nucleotide.fetchFastaBatch(['NM_007294.4', 'NM_000546.6']);

    expect(records).toHaveLength(2);
    expect(records[0]!.id).toContain('NM_007294');
    expect(records[1]!.id).toContain('NM_000546');
  });

  it('should fetch a nucleotide GenBank record', async () => {
    const record = await nucleotide.fetchGenBank('NM_007294');

    expect(record.accession).toBe('NM_007294');
    expect(record.definition).toContain('BRCA1');
    expect(record.locus.moleculeType).toBe('mRNA');
    expect(record.features.length).toBeGreaterThan(0);
    expect(record.sequence.length).toBeGreaterThan(100);
  });

  it('should fetch multiple nucleotide GenBank records', async () => {
    const records = await nucleotide.fetchGenBankBatch(['NM_007294', 'NM_000546']);

    expect(records).toHaveLength(2);
    expect(records[0]!.accession).toBe('NM_007294');
    expect(records[1]!.accession).toBe('NM_000546');
  });
});
