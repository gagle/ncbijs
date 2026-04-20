import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './geo-client';
import type { GeoClientConfig } from './geo-client';
import type { GeoConfig, GeoRecord, GeoSample, GeoSearchResult } from './interfaces/geo.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class Geo {
  private readonly _config: GeoClientConfig;

  constructor(config?: GeoConfig) {
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
  ): Promise<GeoSearchResult> {
    const params = new URLSearchParams({
      db: 'gds',
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
  ): Promise<ReadonlyArray<GeoRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<GeoRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'gds',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<GeoRecord> = [];

    for (const uid of uids) {
      const entry = getGeoEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapGeoRecord(entry));
    }

    return records;
  }
}

function getGeoEntry(result: RawESummaryResult, uid: string): RawGeoEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawGeoEntry;
}

function appendCredentials(params: URLSearchParams, config: GeoClientConfig): void {
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

interface RawGeoEntry {
  readonly uid?: string;
  readonly accession?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly taxon?: string;
  readonly entrytype?: string;
  readonly gdstype?: string;
  readonly ptechtype?: string;
  readonly pdat?: string;
  readonly suppfile?: string;
  readonly samples?: ReadonlyArray<RawGeoSample>;
  readonly n_samples?: number;
  readonly pubmedids?: ReadonlyArray<string | number>;
  readonly ftplink?: string;
  readonly bioproject?: string;
  readonly gpl?: string;
  readonly gse?: string;
  readonly error?: string;
}

interface RawGeoSample {
  readonly accession?: string;
  readonly title?: string;
}

function mapGeoRecord(raw: RawGeoEntry): GeoRecord {
  return {
    uid: raw.uid ?? '',
    accession: raw.accession ?? '',
    title: raw.title ?? '',
    summary: raw.summary ?? '',
    taxon: raw.taxon ?? '',
    entryType: raw.entrytype ?? '',
    datasetType: raw.gdstype ?? '',
    platformTechnologyType: raw.ptechtype ?? '',
    publicationDate: raw.pdat ?? '',
    supplementaryFiles: raw.suppfile ?? '',
    samples: (raw.samples ?? []).map(mapSample),
    sampleCount: raw.n_samples ?? 0,
    pubmedIds: (raw.pubmedids ?? []).map(String),
    ftpLink: raw.ftplink ?? '',
    bioproject: raw.bioproject ?? '',
    platformId: raw.gpl ?? '',
    seriesId: raw.gse ?? '',
  };
}

function mapSample(raw: RawGeoSample): GeoSample {
  return {
    accession: raw.accession ?? '',
    title: raw.title ?? '',
  };
}
