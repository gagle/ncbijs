import { afterEach, describe, expect, it, vi } from 'vitest';
import { Nucleotide } from './nucleotide';
import { NucleotideHttpError } from './nucleotide-client';

const FASTA_RESPONSE = `>NM_007294.4 Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA
AGCTCGCTGAGACTTCCTGGACCCCGCACCAGGCTGTGGGGTTTCTCAGATAACTGGGCCCCTGCGCTCAGGAGGCCTTC
`;

const FASTA_BATCH_RESPONSE = `>NM_007294.4 Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA
AGCTCGCTGAGACTTCCTGGACCCCGCACCAGGCTGTGGGGTTTCTCAGATAACTGGGCCCCTGCGCTCAGGAGGCCTTC
>NM_000546.6 Homo sapiens tumor protein p53 (TP53), mRNA
GATGCTGTCCCCGGACGATATTGAACAATGGTTCACTGAAGACCCAGGTCCAGATGAAGCTCCCAGAAT
`;

const GENBANK_RESPONSE = `LOCUS       NM_007294               7270 bp    mRNA    linear   PRI 15-MAR-2024
DEFINITION  Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA.
ACCESSION   NM_007294
VERSION     NM_007294.4
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
FEATURES             Location/Qualifiers
     source          1..7270
                     /organism="Homo sapiens"
     gene            1..7270
                     /gene="BRCA1"
     CDS             120..5711
                     /gene="BRCA1"
                     /protein_id="NP_009225.1"
ORIGIN
        1 agctcgctga gacttcctgg accccgcacc aggctgtggg gtttctcaga taactgggcc
       61 cctgcgctca ggaggccttc accctctgct ctgggtaaag
//
`;

const GENBANK_BATCH_RESPONSE = `LOCUS       NM_007294               7270 bp    mRNA    linear   PRI 15-MAR-2024
DEFINITION  Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA.
ACCESSION   NM_007294
VERSION     NM_007294.4
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
ORIGIN
        1 agctcgctga gacttcctgg accccgcacc aggctgtggg
//
LOCUS       NM_000546               2629 bp    mRNA    linear   PRI 10-MAR-2024
DEFINITION  Homo sapiens tumor protein p53 (TP53), mRNA.
ACCESSION   NM_000546
VERSION     NM_000546.6
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
ORIGIN
        1 gatgctgtcc ccggacgata ttgaacaatg gttcactgaa gacccaggtc
//
`;

function mockFetchText(text: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(text),
    }),
  );
}

function mockFetchError(status: number, body: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

describe('Nucleotide', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const nucleotide = new Nucleotide();
      expect(nucleotide).toBeInstanceOf(Nucleotide);
    });

    it('should create instance with custom config', () => {
      const nucleotide = new Nucleotide({ apiKey: 'test-key', maxRetries: 5 });
      expect(nucleotide).toBeInstanceOf(Nucleotide);
    });
  });

  describe('fetchFasta', () => {
    it('should fetch and parse a FASTA record', async () => {
      mockFetchText(FASTA_RESPONSE);
      const nucleotide = new Nucleotide();

      const record = await nucleotide.fetchFasta('NM_007294.4');

      expect(record.id).toBe('NM_007294.4');
      expect(record.description).toBe('Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA');
      expect(record.sequence).toContain('AGCTCGCTGA');
    });

    it('should build correct EFetch URL', async () => {
      mockFetchText(FASTA_RESPONSE);
      const nucleotide = new Nucleotide();

      await nucleotide.fetchFasta('NM_007294.4');

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('db=nucleotide');
      expect(url).toContain('id=NM_007294.4');
      expect(url).toContain('rettype=fasta');
      expect(url).toContain('retmode=text');
    });

    it('should include api-key header when configured', async () => {
      mockFetchText(FASTA_RESPONSE);
      const nucleotide = new Nucleotide({ apiKey: 'my-key' });

      await nucleotide.fetchFasta('NM_007294.4');

      const fetchFn = vi.mocked(globalThis.fetch);
      const requestInit = fetchFn.mock.calls[0]![1] as RequestInit;
      const headers = requestInit.headers as Record<string, string>;
      expect(headers['api-key']).toBe('my-key');
    });

    it('should return empty record when no FASTA data', async () => {
      mockFetchText('');
      const nucleotide = new Nucleotide();

      const record = await nucleotide.fetchFasta('INVALID');

      expect(record.id).toBe('INVALID');
      expect(record.sequence).toBe('');
    });

    it('should throw NucleotideHttpError on failure', async () => {
      mockFetchError(404, 'Not found');
      const nucleotide = new Nucleotide();

      await expect(nucleotide.fetchFasta('INVALID')).rejects.toThrow(NucleotideHttpError);
    });
  });

  describe('fetchFastaBatch', () => {
    it('should fetch and parse multiple FASTA records', async () => {
      mockFetchText(FASTA_BATCH_RESPONSE);
      const nucleotide = new Nucleotide();

      const records = await nucleotide.fetchFastaBatch(['NM_007294.4', 'NM_000546.6']);

      expect(records).toHaveLength(2);
      expect(records[0]!.id).toBe('NM_007294.4');
      expect(records[1]!.id).toBe('NM_000546.6');
    });

    it('should send comma-separated IDs in URL', async () => {
      mockFetchText(FASTA_BATCH_RESPONSE);
      const nucleotide = new Nucleotide();

      await nucleotide.fetchFastaBatch(['NM_007294.4', 'NM_000546.6']);

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('id=NM_007294.4%2CNM_000546.6');
    });

    it('should return empty array for empty response', async () => {
      mockFetchText('');
      const nucleotide = new Nucleotide();

      const records = await nucleotide.fetchFastaBatch(['INVALID']);

      expect(records).toEqual([]);
    });
  });

  describe('fetchGenBank', () => {
    it('should fetch and parse a GenBank record', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const nucleotide = new Nucleotide();

      const record = await nucleotide.fetchGenBank('NM_007294');

      expect(record.accession).toBe('NM_007294');
      expect(record.definition).toContain('BRCA1');
      expect(record.locus.moleculeType).toBe('mRNA');
      expect(record.sequence).toContain('agctcgctga');
    });

    it('should build correct EFetch URL for GenBank', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const nucleotide = new Nucleotide();

      await nucleotide.fetchGenBank('NM_007294');

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('db=nucleotide');
      expect(url).toContain('rettype=gb');
      expect(url).toContain('retmode=text');
    });

    it('should return empty record when no GenBank data', async () => {
      mockFetchText('');
      const nucleotide = new Nucleotide();

      const record = await nucleotide.fetchGenBank('INVALID');

      expect(record.accession).toBe('INVALID');
      expect(record.sequence).toBe('');
      expect(record.features).toEqual([]);
    });

    it('should parse features from GenBank record', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const nucleotide = new Nucleotide();

      const record = await nucleotide.fetchGenBank('NM_007294');

      expect(record.features).toHaveLength(3);
      expect(record.features[0]!.key).toBe('source');
      expect(record.features[1]!.key).toBe('gene');
      expect(record.features[2]!.key).toBe('CDS');
    });
  });

  describe('fetchGenBankBatch', () => {
    it('should fetch and parse multiple GenBank records', async () => {
      mockFetchText(GENBANK_BATCH_RESPONSE);
      const nucleotide = new Nucleotide();

      const records = await nucleotide.fetchGenBankBatch(['NM_007294', 'NM_000546']);

      expect(records).toHaveLength(2);
      expect(records[0]!.accession).toBe('NM_007294');
      expect(records[1]!.accession).toBe('NM_000546');
    });

    it('should send comma-separated IDs for GenBank batch', async () => {
      mockFetchText(GENBANK_BATCH_RESPONSE);
      const nucleotide = new Nucleotide();

      await nucleotide.fetchGenBankBatch(['NM_007294', 'NM_000546']);

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('id=NM_007294%2CNM_000546');
      expect(url).toContain('rettype=gb');
    });

    it('should return empty array for empty response', async () => {
      mockFetchText('');
      const nucleotide = new Nucleotide();

      const records = await nucleotide.fetchGenBankBatch(['INVALID']);

      expect(records).toEqual([]);
    });
  });
});

describe('NucleotideHttpError', () => {
  it('should have correct name and properties', () => {
    const error = new NucleotideHttpError(500, 'Server error');

    expect(error.name).toBe('NucleotideHttpError');
    expect(error.status).toBe(500);
    expect(error.body).toBe('Server error');
    expect(error.message).toBe('NCBI EFetch (nucleotide) returned status 500');
  });

  it('should be an instance of Error', () => {
    const error = new NucleotideHttpError(404, 'Not found');

    expect(error).toBeInstanceOf(Error);
  });
});
