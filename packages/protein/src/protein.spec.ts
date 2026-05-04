import { afterEach, describe, expect, it, vi } from 'vitest';
import { Protein } from './protein';
import { ProteinHttpError } from './protein-client';

const FASTA_RESPONSE = `>NP_000537.3 cellular tumor antigen p53 [Homo sapiens]
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP
`;

const FASTA_BATCH_RESPONSE = `>NP_000537.3 cellular tumor antigen p53 [Homo sapiens]
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP
>NP_001005484.2 olfactory receptor 4F5 [Homo sapiens]
MVTEFIFLGLSDSQELQTFLFMLFFVFYGGIVFGNLLIVITVVSDSHLHSPMYFLLANLSL
`;

const GENBANK_RESPONSE = `LOCUS       NP_000537                393 aa            linear   PRI 10-MAR-2024
DEFINITION  cellular tumor antigen p53 [Homo sapiens].
ACCESSION   NP_000537
VERSION     NP_000537.3
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
FEATURES             Location/Qualifiers
     source          1..393
                     /organism="Homo sapiens"
     CDS             1..393
                     /gene="TP53"
ORIGIN
        1 meepqsdpsv epplsqetfs dlwkllpenn vlsplpsqam ddlmlspddi
       61 eqwftedpgp
//
`;

const GENBANK_BATCH_RESPONSE = `LOCUS       NP_000537                393 aa            linear   PRI 10-MAR-2024
DEFINITION  cellular tumor antigen p53 [Homo sapiens].
ACCESSION   NP_000537
VERSION     NP_000537.3
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
ORIGIN
        1 meepqsdpsv epplsqetfs dlwkllpenn vlsplpsqam ddlmlspddi
       61 eqwftedpgp
//
LOCUS       NP_001005484              320 aa            linear   PRI 15-MAR-2024
DEFINITION  olfactory receptor 4F5 [Homo sapiens].
ACCESSION   NP_001005484
VERSION     NP_001005484.2
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
ORIGIN
        1 mvtefiflgl sdsqelqtfl fmlffvfygg ivfgnllivi tvvsdshlhs
       61 pmyfllanlsl
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

describe('Protein', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const protein = new Protein();
      expect(protein).toBeInstanceOf(Protein);
    });

    it('should create instance with custom config', () => {
      const protein = new Protein({ apiKey: 'test-key', maxRetries: 5 });
      expect(protein).toBeInstanceOf(Protein);
    });
  });

  describe('fetchFasta', () => {
    it('should fetch and parse a FASTA record', async () => {
      mockFetchText(FASTA_RESPONSE);
      const protein = new Protein();

      const record = await protein.fetchFasta('NP_000537.3');

      expect(record.id).toBe('NP_000537.3');
      expect(record.description).toBe('cellular tumor antigen p53 [Homo sapiens]');
      expect(record.sequence).toContain('MEEPQSDPSV');
    });

    it('should build correct EFetch URL', async () => {
      mockFetchText(FASTA_RESPONSE);
      const protein = new Protein();

      await protein.fetchFasta('NP_000537.3');

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('db=protein');
      expect(url).toContain('id=NP_000537.3');
      expect(url).toContain('rettype=fasta');
      expect(url).toContain('retmode=text');
    });

    it('should include api-key header when configured', async () => {
      mockFetchText(FASTA_RESPONSE);
      const protein = new Protein({ apiKey: 'my-key' });

      await protein.fetchFasta('NP_000537.3');

      const fetchFn = vi.mocked(globalThis.fetch);
      const requestInit = fetchFn.mock.calls[0]![1] as RequestInit;
      const headers = requestInit.headers as Record<string, string>;
      expect(headers['api-key']).toBe('my-key');
    });

    it('should return empty record when no FASTA data', async () => {
      mockFetchText('');
      const protein = new Protein();

      const record = await protein.fetchFasta('INVALID');

      expect(record.id).toBe('INVALID');
      expect(record.sequence).toBe('');
    });

    it('should throw ProteinHttpError on failure', async () => {
      mockFetchError(404, 'Not found');
      const protein = new Protein();

      await expect(protein.fetchFasta('INVALID')).rejects.toThrow(ProteinHttpError);
    });
  });

  describe('fetchFastaBatch', () => {
    it('should fetch and parse multiple FASTA records', async () => {
      mockFetchText(FASTA_BATCH_RESPONSE);
      const protein = new Protein();

      const records = await protein.fetchFastaBatch(['NP_000537.3', 'NP_001005484.2']);

      expect(records).toHaveLength(2);
      expect(records[0]!.id).toBe('NP_000537.3');
      expect(records[1]!.id).toBe('NP_001005484.2');
    });

    it('should send comma-separated IDs in URL', async () => {
      mockFetchText(FASTA_BATCH_RESPONSE);
      const protein = new Protein();

      await protein.fetchFastaBatch(['NP_000537.3', 'NP_001005484.2']);

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('id=NP_000537.3%2CNP_001005484.2');
    });

    it('should return empty array for empty response', async () => {
      mockFetchText('');
      const protein = new Protein();

      const records = await protein.fetchFastaBatch(['INVALID']);

      expect(records).toEqual([]);
    });
  });

  describe('fetchGenBank', () => {
    it('should fetch and parse a GenBank record', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const protein = new Protein();

      const record = await protein.fetchGenBank('NP_000537');

      expect(record.accession).toBe('NP_000537');
      expect(record.definition).toBe('cellular tumor antigen p53 [Homo sapiens].');
      expect(record.locus.moleculeType).toBe('aa');
      expect(record.sequence).toContain('meepqsdpsv');
    });

    it('should build correct EFetch URL for GenBank', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const protein = new Protein();

      await protein.fetchGenBank('NP_000537');

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('db=protein');
      expect(url).toContain('rettype=gp');
      expect(url).toContain('retmode=text');
    });

    it('should return empty record when no GenBank data', async () => {
      mockFetchText('');
      const protein = new Protein();

      const record = await protein.fetchGenBank('INVALID');

      expect(record.accession).toBe('INVALID');
      expect(record.sequence).toBe('');
      expect(record.features).toEqual([]);
    });

    it('should parse features from GenBank record', async () => {
      mockFetchText(GENBANK_RESPONSE);
      const protein = new Protein();

      const record = await protein.fetchGenBank('NP_000537');

      expect(record.features).toHaveLength(2);
      expect(record.features[0]!.key).toBe('source');
      expect(record.features[1]!.key).toBe('CDS');
    });
  });

  describe('fetchGenBankBatch', () => {
    it('should fetch and parse multiple GenBank records', async () => {
      mockFetchText(GENBANK_BATCH_RESPONSE);
      const protein = new Protein();

      const records = await protein.fetchGenBankBatch(['NP_000537', 'NP_001005484']);

      expect(records).toHaveLength(2);
      expect(records[0]!.accession).toBe('NP_000537');
      expect(records[1]!.accession).toBe('NP_001005484');
    });

    it('should send comma-separated IDs for GenBank batch', async () => {
      mockFetchText(GENBANK_BATCH_RESPONSE);
      const protein = new Protein();

      await protein.fetchGenBankBatch(['NP_000537', 'NP_001005484']);

      const fetchFn = vi.mocked(globalThis.fetch);
      const url = fetchFn.mock.calls[0]![0] as string;
      expect(url).toContain('id=NP_000537%2CNP_001005484');
      expect(url).toContain('rettype=gp');
    });

    it('should return empty array for empty response', async () => {
      mockFetchText('');
      const protein = new Protein();

      const records = await protein.fetchGenBankBatch(['INVALID']);

      expect(records).toEqual([]);
    });
  });
});

describe('ProteinHttpError', () => {
  it('should have correct name and properties', () => {
    const error = new ProteinHttpError(500, 'Server error');

    expect(error.name).toBe('ProteinHttpError');
    expect(error.status).toBe(500);
    expect(error.body).toBe('Server error');
    expect(error.message).toBe('NCBI EFetch (protein) returned status 500');
  });

  it('should be an instance of Error', () => {
    const error = new ProteinHttpError(404, 'Not found');

    expect(error).toBeInstanceOf(Error);
  });
});
