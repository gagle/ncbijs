import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from '@ncbijs/eutils/config';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './omim-client';
import type { OmimClientConfig } from './omim-client';
import type { OmimConfig, OmimEntry, OmimSearchResult } from './interfaces/omim.interface';

/** OMIM genetic disorder and Mendelian inheritance catalog client. */
export class Omim {
  private readonly _config: OmimClientConfig;

  constructor(config?: OmimConfig) {
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

  /** Search OMIM by text query and return matching entry IDs. */
  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<OmimSearchResult> {
    const params = new URLSearchParams({
      db: 'omim',
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

  /** Search OMIM and fetch full entry details in a single call. */
  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<OmimEntry>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  /** Fetch OMIM entry details by their UIDs. */
  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<OmimEntry>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'omim',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const entries: Array<OmimEntry> = [];

    for (const uid of uids) {
      const entry = getOmimEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      entries.push(mapOmimEntry(entry));
    }

    return entries;
  }
}

function getOmimEntry(result: RawESummaryResult, uid: string): RawOmimEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawOmimEntry;
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

interface RawOmimEntry {
  readonly uid?: string;
  readonly oid?: string;
  readonly title?: string;
  readonly alttitles?: string;
  readonly locus?: string;
  readonly error?: string;
}

function parseOmimPrefix(oid: string): string {
  const match = /^([*#+%^]?)/.exec(oid);
  return match?.[1] ?? '';
}

function parseOmimNumber(oid: string): string {
  const match = /(\d+)$/.exec(oid);
  return match?.[1] ?? '';
}

function mapOmimEntry(raw: RawOmimEntry): OmimEntry {
  const oid = raw.oid ?? '';

  return {
    uid: raw.uid ?? '',
    mimNumber: parseOmimNumber(oid),
    prefix: parseOmimPrefix(oid),
    title: raw.title ?? '',
    alternativeTitles: raw.alttitles ?? '',
    geneMapLocus: raw.locus ?? '',
  };
}
