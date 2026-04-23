import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './litvar-client';
import type { LitVarClientConfig } from './litvar-client';
import type {
  LitVarAnnotation,
  LitVarConfig,
  LitVarPublication,
  LitVarSearchResult,
  LitVarVariant,
} from '../interfaces/litvar.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/litvar2-api';
const REQUESTS_PER_SECOND = 3;

interface RawVariantResult {
  readonly rsid?: string;
  readonly hgvs_list?: ReadonlyArray<string>;
  readonly gene?: string;
  readonly pmid_count?: number;
}

interface RawVariantResponse {
  readonly results?: ReadonlyArray<RawVariantResult>;
}

interface RawPublication {
  readonly pmid?: number;
  readonly title?: string;
  readonly journal?: string;
  readonly year?: number;
}

interface RawSearchResult {
  readonly term?: string;
  readonly type?: string;
  readonly score?: number;
}

interface RawAnnotation {
  readonly disease?: string;
  readonly genes?: ReadonlyArray<string>;
  readonly pmids?: ReadonlyArray<number>;
}

function mapPublication(raw: RawPublication): LitVarPublication {
  return {
    pmid: raw.pmid ?? 0,
    title: raw.title ?? '',
    journal: raw.journal ?? '',
    year: raw.year ?? 0,
  };
}

function mapSearchResult(raw: RawSearchResult): LitVarSearchResult {
  return {
    term: raw.term ?? '',
    type: raw.type ?? '',
    score: raw.score ?? 0,
  };
}

function mapAnnotation(raw: RawAnnotation): LitVarAnnotation {
  return {
    disease: raw.disease ?? '',
    genes: raw.genes ?? [],
    pmids: raw.pmids ?? [],
  };
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

  /** Fetch variant details and publication count for an rsID. */
  public async variant(rsid: string): Promise<LitVarVariant> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/variant/get/litvar/${encodeURIComponent(rsid)}%23%23`;
    const raw = await fetchJson<RawVariantResponse>(url, this._config);

    if (!raw.results || raw.results.length === 0) {
      throw new Error(`No variant found for ${rsid}`);
    }

    const result = raw.results[0]!;

    return {
      rsid: result.rsid ?? '',
      hgvs: result.hgvs_list ?? [],
      gene: result.gene ?? '',
      publicationCount: result.pmid_count ?? 0,
    };
  }

  /** Fetch publications mentioning a variant by rsID. */
  public async publications(rsid: string): Promise<ReadonlyArray<LitVarPublication>> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/variant/publications/litvar/${encodeURIComponent(rsid)}%23%23`;
    const raw = await fetchJson<ReadonlyArray<RawPublication>>(url, this._config);
    return raw.map(mapPublication);
  }

  /** Search LitVar for variants matching a text query. */
  public async search(query: string): Promise<ReadonlyArray<LitVarSearchResult>> {
    if (!query) {
      throw new Error('query must not be empty');
    }

    const url = `${BASE_URL}/api/v1/entity/search/${encodeURIComponent(query)}`;
    const raw = await fetchJson<ReadonlyArray<RawSearchResult>>(url, this._config);
    return raw.map(mapSearchResult);
  }

  /** Fetch detailed annotations for a variant by rsID. */
  public async variantAnnotations(rsid: string): Promise<ReadonlyArray<LitVarAnnotation>> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/api/v1/entity/litvar/${encodeURIComponent(rsid)}%23%23/annotations`;
    const raw = await fetchJson<ReadonlyArray<RawAnnotation>>(url, this._config);
    return raw.map(mapAnnotation);
  }
}
