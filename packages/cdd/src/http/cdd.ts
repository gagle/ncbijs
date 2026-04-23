import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from '@ncbijs/eutils/config';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './cdd-client';
import type { CddClientConfig } from './cdd-client';
import type { CddConfig, CddRecord, CddSearchResult } from '../interfaces/cdd.interface';

/** Conserved Domain Database (CDD) client for searching and fetching domain records. */
export class Cdd {
  private readonly _config: CddClientConfig;

  constructor(config?: CddConfig) {
    const requestsPerSecond = config?.apiKey
      ? EUTILS_REQUESTS_PER_SECOND_WITH_KEY
      : EUTILS_REQUESTS_PER_SECOND;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      ...(config?.tool !== undefined && { tool: config.tool }),
      ...(config?.email !== undefined && { email: config.email }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  /** Search CDD by text query and return matching domain IDs. */
  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<CddSearchResult> {
    const params = new URLSearchParams({
      db: 'cdd',
      term,
      retmode: 'json',
    });

    if (options?.retmax !== undefined) {
      params.set('retmax', String(options.retmax));
    }

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esearch.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESearchResponse>(url, this._config);

    return {
      total: Number(raw.esearchresult?.count ?? '0'),
      ids: raw.esearchresult?.idlist ?? [],
    };
  }

  /** Search CDD and fetch full domain details in a single call. */
  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<CddRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  /** Fetch CDD domain record details by their UIDs. */
  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<CddRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'cdd',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<CddRecord> = [];

    for (const uid of uids) {
      const entry = getCddEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapCddRecord(entry));
    }

    return records;
  }
}

function getCddEntry(result: RawESummaryResult, uid: string): RawCddEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawCddEntry;
}

interface RawESearchResponse {
  readonly esearchresult?: {
    readonly count?: string;
    readonly idlist?: ReadonlyArray<string>;
  };
}

interface RawESummaryResponse {
  readonly result?: RawESummaryResult;
}

type RawESummaryResult = Record<string, unknown> & {
  readonly uids?: ReadonlyArray<string>;
};

interface RawCddEntry {
  readonly uid?: string;
  readonly accession?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly abstract?: string;
  readonly database?: string;
  readonly organism?: string;
  readonly pubdate?: string;
  readonly entrezdate?: string;
  readonly pssmlength?: number;
  readonly structurerepresentative?: string;
  readonly numbersites?: string | number;
  readonly sitedescriptions?: ReadonlyArray<string>;
  readonly status?: string;
  readonly livepssmid?: string;
  readonly error?: string;
}

function mapCddRecord(raw: RawCddEntry): CddRecord {
  return {
    uid: raw.uid ?? '',
    accession: raw.accession ?? '',
    title: raw.title ?? '',
    subtitle: raw.subtitle ?? '',
    abstract: raw.abstract ?? '',
    database: raw.database ?? '',
    organism: raw.organism ?? '',
    publicationDate: raw.pubdate ?? '',
    entrezDate: raw.entrezdate ?? '',
    pssmLength: raw.pssmlength ?? 0,
    structureRepresentative: raw.structurerepresentative ?? '',
    numberOfSites: Number(raw.numbersites) || 0,
    siteDescriptions: raw.sitedescriptions ?? [],
    status: raw.status ?? '',
    livePssmId: raw.livepssmid ?? '',
  };
}
