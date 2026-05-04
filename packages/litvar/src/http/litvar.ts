import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './litvar-client';
import type { LitVarClientConfig } from './litvar-client';
import type {
  LitVarConfig,
  LitVarPublicationResult,
  LitVarSearchResult,
  LitVarVariant,
} from '../interfaces/litvar.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/litvar2-api';
const REQUESTS_PER_SECOND = 3;

interface RawVariantResponse {
  readonly rsid?: string;
  readonly gene?: ReadonlyArray<string>;
  readonly name?: string;
  readonly hgvs?: string;
  readonly data_clinical_significance?: ReadonlyArray<string>;
}

interface RawPublicationsResponse {
  readonly pmids?: ReadonlyArray<number>;
  readonly pmcids?: ReadonlyArray<string>;
  readonly pmids_count?: number;
}

interface RawAutocompleteResult {
  readonly rsid?: string;
  readonly gene?: ReadonlyArray<string>;
  readonly name?: string;
  readonly hgvs?: string;
  readonly pmids_count?: number;
  readonly data_clinical_significance?: ReadonlyArray<string>;
  readonly match?: string;
}

function buildVariantId(rsid: string): string {
  return `litvar@${rsid}%23%23`;
}

/** Client for the LitVar2 API providing variant-literature association queries. */
export class LitVar {
  private readonly _config: LitVarClientConfig;

  constructor(config?: LitVarConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Fetch variant details by rsID. */
  public async variant(rsid: string): Promise<LitVarVariant> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/variant/get/${buildVariantId(rsid)}`;
    const raw = await fetchJson<RawVariantResponse>(url, this._config);

    return {
      rsid: raw.rsid ?? '',
      gene: raw.gene ?? [],
      name: raw.name ?? '',
      hgvs: raw.hgvs ?? '',
      clinicalSignificance: raw.data_clinical_significance ?? [],
    };
  }

  /** Fetch publication IDs associated with a variant by rsID. */
  public async publications(rsid: string): Promise<LitVarPublicationResult> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/variant/get/${buildVariantId(rsid)}/publications`;
    const raw = await fetchJson<RawPublicationsResponse>(url, this._config);

    return {
      pmids: raw.pmids ?? [],
      pmcids: raw.pmcids ?? [],
      count: raw.pmids_count ?? 0,
    };
  }

  /** Search LitVar for variants matching a text query. */
  public async search(query: string): Promise<ReadonlyArray<LitVarSearchResult>> {
    if (!query) {
      throw new Error('query must not be empty');
    }

    const params = new URLSearchParams({ query });
    const url = `${BASE_URL}/variant/autocomplete/?${params.toString()}`;
    const raw = await fetchJson<ReadonlyArray<RawAutocompleteResult>>(url, this._config);

    return raw.map(mapSearchResult);
  }
}

function mapSearchResult(raw: RawAutocompleteResult): LitVarSearchResult {
  return {
    rsid: raw.rsid ?? '',
    gene: raw.gene ?? [],
    name: raw.name ?? '',
    hgvs: raw.hgvs ?? '',
    publicationCount: raw.pmids_count ?? 0,
    clinicalSignificance: raw.data_clinical_significance ?? [],
    match: raw.match ?? '',
  };
}
