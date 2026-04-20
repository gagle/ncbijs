import type { FastaRecord } from '@ncbijs/fasta';
import { parseFasta } from '@ncbijs/fasta';
import type { GenBankRecord } from '@ncbijs/genbank';
import { createEmptyGenBankRecord, parseGenBank } from '@ncbijs/genbank';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchText } from './nucleotide-client';
import type { NucleotideClientConfig } from './nucleotide-client';
import type { NucleotideConfig } from './interfaces/nucleotide.interface';

const EFETCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const REQUESTS_PER_SECOND = 3;

export class Nucleotide {
  private readonly _config: NucleotideClientConfig;

  constructor(config?: NucleotideConfig) {
    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  public async fetchFasta(accession: string): Promise<FastaRecord> {
    const url = buildEfetchUrl(accession, 'fasta', 'text');
    const text = await fetchText(url, this._config);
    const records = parseFasta(text);
    const record = records[0];

    if (record === undefined) {
      return { id: accession, description: '', sequence: '' };
    }

    return record;
  }

  public async fetchFastaBatch(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<FastaRecord>> {
    const url = buildEfetchUrl(accessions.join(','), 'fasta', 'text');
    const text = await fetchText(url, this._config);

    return parseFasta(text);
  }

  public async fetchGenBank(accession: string): Promise<GenBankRecord> {
    const url = buildEfetchUrl(accession, 'gb', 'text');
    const text = await fetchText(url, this._config);
    const records = parseGenBank(text);
    const record = records[0];

    if (record === undefined) {
      return createEmptyGenBankRecord(accession);
    }

    return record;
  }

  public async fetchGenBankBatch(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<GenBankRecord>> {
    const url = buildEfetchUrl(accessions.join(','), 'gb', 'text');
    const text = await fetchText(url, this._config);

    return parseGenBank(text);
  }
}

function buildEfetchUrl(id: string, rettype: string, retmode: string): string {
  return `${EFETCH_BASE}?db=nucleotide&id=${encodeURIComponent(id)}&rettype=${rettype}&retmode=${retmode}`;
}
