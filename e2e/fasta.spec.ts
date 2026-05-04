import { describe, expect, it } from 'vitest';
import { EUtils } from '@ncbijs/eutils';
import { parseFasta } from '@ncbijs/fasta';

const eutils = new EUtils({
  tool: 'ncbijs-e2e',
  email: 'ncbijs-e2e@users.noreply.github.com',
  apiKey: process.env['NCBI_API_KEY'],
});

describe('FASTA Parser E2E', () => {
  it('should parse a real nucleotide FASTA from NCBI efetch', async () => {
    const fastaText = await eutils.efetch({
      db: 'nuccore',
      id: 'NM_000546.6',
      rettype: 'fasta',
      retmode: 'text',
    });

    const records = parseFasta(fastaText);

    expect(records).toHaveLength(1);
    expect(records[0]!.id).toContain('NM_000546');
    expect(records[0]!.description).toContain('Homo sapiens');
    expect(records[0]!.description).toContain('TP53');
    expect(records[0]!.sequence.length).toBeGreaterThan(100);
    expect(records[0]!.sequence).toMatch(/^[ATCGN]+$/i);
  });

  it('should parse a real protein FASTA from NCBI efetch', async () => {
    const fastaText = await eutils.efetch({
      db: 'protein',
      id: 'NP_000537.3',
      rettype: 'fasta',
      retmode: 'text',
    });

    const records = parseFasta(fastaText);

    expect(records).toHaveLength(1);
    expect(records[0]!.id).toContain('NP_000537');
    expect(records[0]!.sequence.length).toBeGreaterThan(50);
  });

  it('should parse multiple sequences from a batch efetch', async () => {
    const fastaText = await eutils.efetch({
      db: 'nuccore',
      id: 'NM_000546.6,NM_007294.4',
      rettype: 'fasta',
      retmode: 'text',
    });

    const records = parseFasta(fastaText);

    expect(records).toHaveLength(2);
    expect(records[0]!.sequence.length).toBeGreaterThan(0);
    expect(records[1]!.sequence.length).toBeGreaterThan(0);
  });
});
