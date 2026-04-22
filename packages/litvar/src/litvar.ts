import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './litvar-client';
import type { LitVarClientConfig } from './litvar-client';
import type {
  LitVarAnnotation,
  LitVarConfig,
  LitVarPublication,
  LitVarSearchResult,
  LitVarVariant,
} from './interfaces/litvar.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/litvar2-api';
const REQUESTS_PER_SECOND = 3;

interface RawVariantResult {
  readonly rsid: string;
  readonly hgvs_list: ReadonlyArray<string>;
  readonly gene: string;
  readonly pmid_count: number;
}

interface RawVariantResponse {
  readonly results: ReadonlyArray<RawVariantResult>;
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
      rsid: result.rsid,
      hgvs: result.hgvs_list,
      gene: result.gene,
      publicationCount: result.pmid_count,
    };
  }

  /** Fetch publications mentioning a variant by rsID. */
  public async publications(rsid: string): Promise<ReadonlyArray<LitVarPublication>> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/variant/publications/litvar/${encodeURIComponent(rsid)}%23%23`;
    return fetchJson<ReadonlyArray<LitVarPublication>>(url, this._config);
  }

  /** Search LitVar for variants matching a text query. */
  public async search(query: string): Promise<ReadonlyArray<LitVarSearchResult>> {
    if (!query) {
      throw new Error('query must not be empty');
    }

    const url = `${BASE_URL}/api/v1/entity/search/${encodeURIComponent(query)}`;
    return fetchJson<ReadonlyArray<LitVarSearchResult>>(url, this._config);
  }

  /** Fetch detailed annotations for a variant by rsID. */
  public async variantAnnotations(rsid: string): Promise<ReadonlyArray<LitVarAnnotation>> {
    if (!rsid) {
      throw new Error('rsid must not be empty');
    }

    const url = `${BASE_URL}/api/v1/entity/litvar/${encodeURIComponent(rsid)}%23%23/annotations`;
    return fetchJson<ReadonlyArray<LitVarAnnotation>>(url, this._config);
  }
}
