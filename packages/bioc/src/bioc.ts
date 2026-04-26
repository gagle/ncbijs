import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchText } from './bioc-client';
import type { BioCClientConfig } from './bioc-client';
import type {
  BioCCollection,
  BioCConfig,
  BioCDocument,
  BioCFormat,
  EntitySearchResult,
  RawEntitySearchResult,
} from './interfaces/bioc.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful';
const PUBTATOR3_BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api';
const REQUESTS_PER_SECOND = 3;

/** Client for the BioC API providing annotated PubMed and PMC article retrieval. */
export class BioC {
  private readonly _config: BioCClientConfig;

  constructor(config?: BioCConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Fetch BioC annotations for a PubMed article by PMID. */
  public pubmed(pmid: string, format?: 'json'): Promise<BioCDocument>;
  public pubmed(pmid: string, format: 'xml'): Promise<string>;
  public pubmed(pmid: string, format: BioCFormat = 'json'): Promise<BioCDocument | string> {
    return this.fetchBioC('pmid', pmid, format);
  }

  /** Fetch BioC annotations for a PMC article by PMCID. */
  public pmc(pmcid: string, format?: 'json'): Promise<BioCDocument>;
  public pmc(pmcid: string, format: 'xml'): Promise<string>;
  public pmc(pmcid: string, format: BioCFormat = 'json'): Promise<BioCDocument | string> {
    return this.fetchBioC('pmcid', pmcid, format);
  }

  /** Batch fetch BioC annotations for multiple PubMed articles. */
  public pubmedBatch(
    pmids: ReadonlyArray<string>,
    format?: 'json',
  ): Promise<ReadonlyArray<BioCDocument>>;
  public pubmedBatch(pmids: ReadonlyArray<string>, format: 'xml'): Promise<string>;
  public pubmedBatch(
    pmids: ReadonlyArray<string>,
    format: BioCFormat = 'json',
  ): Promise<ReadonlyArray<BioCDocument> | string> {
    return this.fetchBioCBatch('pmids', pmids, format);
  }

  /** Batch fetch BioC annotations for multiple PMC articles. */
  public pmcBatch(
    pmcids: ReadonlyArray<string>,
    format?: 'json',
  ): Promise<ReadonlyArray<BioCDocument>>;
  public pmcBatch(pmcids: ReadonlyArray<string>, format: 'xml'): Promise<string>;
  public pmcBatch(
    pmcids: ReadonlyArray<string>,
    format: BioCFormat = 'json',
  ): Promise<ReadonlyArray<BioCDocument> | string> {
    return this.fetchBioCBatch('pmcids', pmcids, format);
  }

  /** Search for entities by name using the PubTator3 autocomplete API. */
  public async entitySearch(
    query: string,
    type?: string,
  ): Promise<ReadonlyArray<EntitySearchResult>> {
    if (!query) {
      throw new Error('query must not be empty');
    }

    let url = `${PUBTATOR3_BASE_URL}/entity/autocomplete/?query=${encodeURIComponent(query)}`;

    if (type) {
      url += `&type=${encodeURIComponent(type)}`;
    }

    const text = await fetchText(url, this._config);
    const rawResults = JSON.parse(text) as ReadonlyArray<RawEntitySearchResult>;

    return rawResults.map((raw) => ({
      id: raw.db_id,
      name: raw.name,
      type: raw.biotype,
    }));
  }

  private async fetchBioC(
    idType: 'pmid' | 'pmcid',
    id: string,
    format: BioCFormat,
  ): Promise<BioCDocument | string> {
    if (!id) {
      throw new Error('id must not be empty');
    }

    const cgiSegment = idType === 'pmid' ? 'pubmed.cgi' : 'pmcoa.cgi';
    const biocFormat = format === 'xml' ? 'BioC_xml' : 'BioC_json';
    const url = `${BASE_URL}/${cgiSegment}/${biocFormat}/${encodeURIComponent(id)}/unicode`;
    const text = await fetchText(url, this._config);

    if (format === 'xml') {
      return text;
    }

    const collection = JSON.parse(text) as BioCCollection;
    const document = collection.documents[0];

    if (document === undefined) {
      throw new Error('BioC API returned a collection with no documents');
    }

    return document;
  }

  private async fetchBioCBatch(
    idParam: string,
    ids: ReadonlyArray<string>,
    format: BioCFormat,
  ): Promise<ReadonlyArray<BioCDocument> | string> {
    if (ids.length === 0) {
      throw new Error('ids must not be empty');
    }

    const formatSegment = format === 'xml' ? 'biocxml' : 'biocjson';
    const exportSegment = idParam === 'pmcids' ? 'pmc_export' : 'export';
    const commaSeparated = ids.map((id) => encodeURIComponent(id)).join(',');
    const url = `${PUBTATOR3_BASE_URL}/publications/${exportSegment}/${formatSegment}?${idParam}=${commaSeparated}`;
    const text = await fetchText(url, this._config);

    if (format === 'xml') {
      return text;
    }

    return JSON.parse(text) as ReadonlyArray<BioCDocument>;
  }
}
