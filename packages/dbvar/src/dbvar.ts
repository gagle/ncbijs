import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './dbvar-client';
import type { DbVarClientConfig } from './dbvar-client';
import type {
  DbVarConfig,
  DbVarGene,
  DbVarPlacement,
  DbVarRecord,
  DbVarSearchResult,
} from './interfaces/dbvar.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class DbVar {
  private readonly _config: DbVarClientConfig;

  constructor(config?: DbVarConfig) {
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
  ): Promise<DbVarSearchResult> {
    const params = new URLSearchParams({
      db: 'dbvar',
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
  ): Promise<ReadonlyArray<DbVarRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<DbVarRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'dbvar',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<DbVarRecord> = [];

    for (const uid of uids) {
      const entry = getDbVarEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapDbVarRecord(entry));
    }

    return records;
  }
}

function getDbVarEntry(result: RawESummaryResult, uid: string): RawDbVarEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawDbVarEntry;
}

function appendCredentials(params: URLSearchParams, config: DbVarClientConfig): void {
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

interface RawDbVarEntry {
  readonly uid?: string;
  readonly obj_type?: string;
  readonly st?: string;
  readonly sv?: string;
  readonly study_type?: string;
  readonly variant_count?: string | number;
  readonly tax_id?: number | string;
  readonly organism?: string;
  readonly dbvarplacementlist?: ReadonlyArray<RawPlacement>;
  readonly dbvargenelist?: ReadonlyArray<RawGene>;
  readonly dbvarmethodlist?: ReadonlyArray<string>;
  readonly dbvarclinicalsignificancelist?: ReadonlyArray<string>;
  readonly dbvarvarianttypelist?: ReadonlyArray<string>;
  readonly variant_call_count?: number;
  readonly error?: string;
}

interface RawPlacement {
  readonly chr?: string;
  readonly chr_start?: number;
  readonly chr_end?: number;
  readonly assembly?: string;
}

interface RawGene {
  readonly id?: number;
  readonly name?: string;
}

function mapDbVarRecord(raw: RawDbVarEntry): DbVarRecord {
  return {
    uid: raw.uid ?? '',
    objectType: raw.obj_type ?? '',
    studyAccession: raw.st ?? '',
    variantAccession: raw.sv ?? '',
    studyType: raw.study_type ?? '',
    variantCount: Number(raw.variant_count ?? 0) || 0,
    taxId: Number(raw.tax_id ?? 0) || 0,
    organism: raw.organism ?? '',
    placements: (raw.dbvarplacementlist ?? []).map(mapPlacement),
    genes: (raw.dbvargenelist ?? []).map(mapGene),
    methods: raw.dbvarmethodlist ?? [],
    clinicalSignificances: raw.dbvarclinicalsignificancelist ?? [],
    variantTypes: raw.dbvarvarianttypelist ?? [],
    variantCallCount: raw.variant_call_count ?? 0,
  };
}

function mapPlacement(raw: RawPlacement): DbVarPlacement {
  return {
    chromosome: raw.chr ?? '',
    start: raw.chr_start ?? 0,
    end: raw.chr_end ?? 0,
    assembly: raw.assembly ?? '',
  };
}

function mapGene(raw: RawGene): DbVarGene {
  return {
    id: raw.id ?? 0,
    name: raw.name ?? '',
  };
}
