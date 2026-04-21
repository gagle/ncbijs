import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from '@ncbijs/eutils/config';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './gtr-client';
import type { GtrClientConfig } from './gtr-client';
import type {
  GtrAnalyte,
  GtrCertification,
  GtrCondition,
  GtrConfig,
  GtrLocation,
  GtrMethod,
  GtrMethodCategory,
  GtrSearchResult,
  GtrTest,
} from './interfaces/gtr.interface';

/** Genetic Testing Registry (GTR) client for searching and fetching genetic tests. */
export class Gtr {
  private readonly _config: GtrClientConfig;

  constructor(config?: GtrConfig) {
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

  /** Search GTR by text query and return matching test IDs. */
  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<GtrSearchResult> {
    const params = new URLSearchParams({
      db: 'gtr',
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

  /** Search GTR and fetch full test details in a single call. */
  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<GtrTest>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  /** Fetch GTR test details by their UIDs. */
  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<GtrTest>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'gtr',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const tests: Array<GtrTest> = [];

    for (const uid of uids) {
      const entry = getGtrEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      tests.push(mapGtrTest(entry));
    }

    return tests;
  }
}

function getGtrEntry(result: RawESummaryResult, uid: string): RawGtrEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawGtrEntry;
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

interface RawGtrEntry {
  readonly uid?: string;
  readonly accession?: string;
  readonly testname?: string;
  readonly testtype?: string;
  readonly conditionlist?: ReadonlyArray<RawCondition>;
  readonly analytes?: ReadonlyArray<RawAnalyte>;
  readonly offerer?: string;
  readonly offererlocation?: RawLocation;
  readonly method?: ReadonlyArray<RawMethod>;
  readonly certifications?: ReadonlyArray<RawCertification>;
  readonly specimens?: ReadonlyArray<string>;
  readonly testpurpose?: ReadonlyArray<string>;
  readonly clinicalvalidity?: { readonly description?: string };
  readonly country?: string;
  readonly error?: string;
}

interface RawCondition {
  readonly name?: string;
  readonly acronym?: string;
  readonly cui?: string;
}

interface RawAnalyte {
  readonly analytetype?: string;
  readonly name?: string;
  readonly geneid?: number;
  readonly location?: string;
}

interface RawLocation {
  readonly city?: string;
  readonly state?: string;
  readonly country?: string;
}

interface RawMethod {
  readonly name?: string;
  readonly categorylist?: ReadonlyArray<RawMethodCategory>;
}

interface RawMethodCategory {
  readonly name?: string;
  readonly methodlist?: ReadonlyArray<string>;
}

interface RawCertification {
  readonly certificationtype?: string;
  readonly id?: string;
}

function mapGtrTest(raw: RawGtrEntry): GtrTest {
  return {
    uid: raw.uid ?? '',
    accession: raw.accession ?? '',
    testName: raw.testname ?? '',
    testType: raw.testtype ?? '',
    conditions: (raw.conditionlist ?? []).map(mapCondition),
    analytes: (raw.analytes ?? []).map(mapAnalyte),
    offerer: raw.offerer ?? '',
    offererLocation: mapLocation(raw.offererlocation),
    methods: (raw.method ?? []).map(mapMethod),
    certifications: (raw.certifications ?? []).map(mapCertification),
    specimens: raw.specimens ?? [],
    testPurposes: raw.testpurpose ?? [],
    clinicalValidity: raw.clinicalvalidity?.description ?? '',
    country: raw.country ?? '',
  };
}

function mapCondition(raw: RawCondition): GtrCondition {
  return {
    name: raw.name ?? '',
    acronym: raw.acronym ?? '',
    cui: raw.cui ?? '',
  };
}

function mapAnalyte(raw: RawAnalyte): GtrAnalyte {
  return {
    analyteType: raw.analytetype ?? '',
    name: raw.name ?? '',
    geneId: raw.geneid ?? 0,
    location: raw.location ?? '',
  };
}

function mapLocation(raw: RawLocation | undefined): GtrLocation {
  if (raw === undefined) {
    return { city: '', state: '', country: '' };
  }

  return {
    city: raw.city ?? '',
    state: raw.state ?? '',
    country: raw.country ?? '',
  };
}

function mapMethod(raw: RawMethod): GtrMethod {
  return {
    name: raw.name ?? '',
    categories: (raw.categorylist ?? []).map(mapMethodCategory),
  };
}

function mapMethodCategory(raw: RawMethodCategory): GtrMethodCategory {
  return {
    name: raw.name ?? '',
    methods: raw.methodlist ?? [],
  };
}

function mapCertification(raw: RawCertification): GtrCertification {
  return {
    certificationType: raw.certificationtype ?? '',
    id: raw.id ?? '',
  };
}
