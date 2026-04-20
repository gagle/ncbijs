import { describe, expect, it } from 'vitest';
import { EUtils } from '@ncbijs/eutils';
import { parseGenBank } from '@ncbijs/genbank';

const eutils = new EUtils({
  tool: 'ncbijs-e2e',
  email: 'ncbijs-e2e@users.noreply.github.com',
  apiKey: process.env['NCBI_API_KEY'],
});

describe('GenBank Parser E2E', () => {
  it('should parse a real protein GenBank record', async () => {
    const text = await eutils.efetch({
      db: 'protein',
      id: 'NP_000537.3',
      rettype: 'gp',
      retmode: 'text',
    });

    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.accession).toBe('NP_000537');
    expect(records[0]!.definition).toContain('tumor protein p53');
    expect(records[0]!.locus.moleculeType).toBe('aa');
    expect(records[0]!.organism).toBe('Homo sapiens');
    expect(records[0]!.sequence.length).toBeGreaterThan(50);
    expect(records[0]!.features.length).toBeGreaterThan(0);
  });

  it('should parse a real nucleotide GenBank record', async () => {
    const text = await eutils.efetch({
      db: 'nuccore',
      id: 'NM_007294.4',
      rettype: 'gb',
      retmode: 'text',
    });

    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.accession).toBe('NM_007294');
    expect(records[0]!.definition).toContain('BRCA1');
    expect(records[0]!.locus.moleculeType).toBe('mRNA');
    expect(records[0]!.sequence.length).toBeGreaterThan(100);
    expect(records[0]!.references.length).toBeGreaterThan(0);
  });

  it('should parse multiple GenBank records from batch efetch', async () => {
    const text = await eutils.efetch({
      db: 'protein',
      id: 'NP_000537.3,NP_009225.1',
      rettype: 'gp',
      retmode: 'text',
    });

    const records = parseGenBank(text);

    expect(records).toHaveLength(2);
    expect(records[0]!.accession).toBe('NP_000537');
    expect(records[1]!.accession).toBe('NP_009225');
  });
});
