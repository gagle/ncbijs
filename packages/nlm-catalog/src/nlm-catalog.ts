import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './nlm-catalog-client';
import type { NlmCatalogClientConfig } from './nlm-catalog-client';
import type {
  NlmCatalogConfig,
  NlmCatalogIssn,
  NlmCatalogRecord,
  NlmCatalogSearchResult,
} from './interfaces/nlm-catalog.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class NlmCatalog {
  private readonly _config: NlmCatalogClientConfig;

  constructor(config?: NlmCatalogConfig) {
    const requestsPerSecond = config?.apiKey
      ? REQUESTS_PER_SECOND_WITH_KEY
      : REQUESTS_PER_SECOND_DEFAULT;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      ...(config?.tool !== undefined && { tool: config.tool }),
      ...(config?.email !== undefined && { email: config.email }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<NlmCatalogSearchResult> {
    const params = new URLSearchParams({
      db: 'nlmcatalog',
      term,
      retmode: 'json',
    });

    if (options?.retmax !== undefined) {
      params.set('retmax', String(options.retmax));
    }

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esearch.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESearchResponse>(url, this._config);

    return {
      total: Number(raw.esearchresult?.count ?? '0'),
      ids: raw.esearchresult?.idlist ?? [],
    };
  }

  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<NlmCatalogRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<NlmCatalogRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'nlmcatalog',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<NlmCatalogRecord> = [];

    for (const uid of uids) {
      const entry = getNlmCatalogEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapNlmCatalogRecord(entry));
    }

    return records;
  }
}

function getNlmCatalogEntry(
  result: RawESummaryResult,
  uid: string,
): RawNlmCatalogEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawNlmCatalogEntry;
}

function appendCredentials(params: URLSearchParams, config: NlmCatalogClientConfig): void {
  if (config.apiKey !== undefined) {
    params.set('api_key', config.apiKey);
  }

  if (config.tool !== undefined) {
    params.set('tool', config.tool);
  }

  if (config.email !== undefined) {
    params.set('email', config.email);
  }
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

interface RawNlmCatalogEntry {
  readonly uid?: string;
  readonly nlmuniqueid?: string;
  readonly daterevised?: string;
  readonly titlemainlist?: ReadonlyArray<{ readonly title?: string }>;
  readonly titlemainsort?: string;
  readonly titleotherlist?: ReadonlyArray<{ readonly titlealternate?: string }>;
  readonly issnlist?: ReadonlyArray<{ readonly issn?: string; readonly issntype?: string }>;
  readonly isbn?: string;
  readonly country?: string;
  readonly currentindexingstatus?: string;
  readonly medlineta?: string;
  readonly isoabbreviation?: string;
  readonly startyear?: string;
  readonly endyear?: string;
  readonly jrid?: string;
  readonly language?: string;
  readonly continuationnotes?: string;
  readonly resourceinfolist?: ReadonlyArray<{ readonly typeofresource?: string }>;
  readonly error?: string;
}

function mapNlmCatalogRecord(raw: RawNlmCatalogEntry): NlmCatalogRecord {
  return {
    uid: raw.uid ?? '',
    nlmUniqueId: raw.nlmuniqueid ?? '',
    dateRevised: raw.daterevised ?? '',
    title: raw.titlemainlist?.[0]?.title ?? '',
    titleSort: raw.titlemainsort ?? '',
    alternateTitles: (raw.titleotherlist ?? []).map((entry) => entry.titlealternate ?? ''),
    issns: (raw.issnlist ?? []).map(mapIssn),
    isbn: raw.isbn ?? '',
    country: raw.country ?? '',
    currentIndexingStatus: raw.currentindexingstatus ?? '',
    medlineAbbreviation: raw.medlineta ?? '',
    isoAbbreviation: raw.isoabbreviation ?? '',
    startYear: raw.startyear ?? '',
    endYear: raw.endyear ?? '',
    journalId: raw.jrid ?? '',
    language: raw.language ?? '',
    continuationNotes: raw.continuationnotes ?? '',
    resourceType: raw.resourceinfolist?.[0]?.typeofresource ?? '',
  };
}

function mapIssn(raw: { readonly issn?: string; readonly issntype?: string }): NlmCatalogIssn {
  return {
    issn: raw.issn ?? '',
    type: raw.issntype ?? '',
  };
}
