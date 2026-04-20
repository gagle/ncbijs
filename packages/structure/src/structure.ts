import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './structure-client';
import type { StructureClientConfig } from './structure-client';
import type {
  StructureConfig,
  StructureRecord,
  StructureSearchResult,
} from './interfaces/structure.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class Structure {
  private readonly _config: StructureClientConfig;

  constructor(config?: StructureConfig) {
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
  ): Promise<StructureSearchResult> {
    const params = new URLSearchParams({
      db: 'structure',
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
  ): Promise<ReadonlyArray<StructureRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<StructureRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'structure',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<StructureRecord> = [];

    for (const uid of uids) {
      const entry = getStructureEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapStructureRecord(entry));
    }

    return records;
  }
}

function getStructureEntry(result: RawESummaryResult, uid: string): RawStructureEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawStructureEntry;
}

function appendCredentials(params: URLSearchParams, config: StructureClientConfig): void {
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

interface RawStructureEntry {
  readonly uid?: string;
  readonly pdbacc?: string;
  readonly pdbdescr?: string;
  readonly ec?: string;
  readonly resolution?: string;
  readonly expmethod?: string;
  readonly pdbclass?: string;
  readonly pdbdepositdate?: string;
  readonly mmdbentrydate?: string;
  readonly mmdbmodifydate?: string;
  readonly organismlist?: ReadonlyArray<string>;
  readonly pdbaccsynlist?: ReadonlyArray<string>;
  readonly ligcode?: string;
  readonly ligcount?: string | number;
  readonly modproteinrescount?: string | number;
  readonly moddnarescount?: string | number;
  readonly modrnarescount?: string | number;
  readonly proteinmoleculecount?: number;
  readonly dnamoleculecount?: string | number;
  readonly rnamoleculecount?: string | number;
  readonly biopolymercount?: number;
  readonly othermoleculecount?: number;
  readonly error?: string;
}

function mapStructureRecord(raw: RawStructureEntry): StructureRecord {
  return {
    uid: raw.uid ?? '',
    pdbAccession: raw.pdbacc ?? '',
    description: raw.pdbdescr ?? '',
    enzymeClassification: raw.ec ?? '',
    resolution: raw.resolution ?? '',
    experimentalMethod: raw.expmethod ?? '',
    pdbClass: raw.pdbclass ?? '',
    pdbDepositDate: raw.pdbdepositdate ?? '',
    mmdbEntryDate: raw.mmdbentrydate ?? '',
    mmdbModifyDate: raw.mmdbmodifydate ?? '',
    organisms: raw.organismlist ?? [],
    pdbAccessionSynonyms: raw.pdbaccsynlist ?? [],
    ligandCode: raw.ligcode ?? '',
    ligandCount: Number(raw.ligcount ?? 0) || 0,
    modifiedProteinResidueCount: Number(raw.modproteinrescount ?? 0) || 0,
    modifiedDnaResidueCount: Number(raw.moddnarescount ?? 0) || 0,
    modifiedRnaResidueCount: Number(raw.modrnarescount ?? 0) || 0,
    proteinMoleculeCount: Number(raw.proteinmoleculecount ?? 0) || 0,
    dnaMoleculeCount: Number(raw.dnamoleculecount ?? 0) || 0,
    rnaMoleculeCount: Number(raw.rnamoleculecount ?? 0) || 0,
    biopolymerCount: raw.biopolymercount ?? 0,
    otherMoleculeCount: raw.othermoleculecount ?? 0,
  };
}
