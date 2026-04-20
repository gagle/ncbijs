import { TokenBucket } from '@ncbijs/rate-limiter';
import { readAllBlocksWithAttributes, readBlock, readTag } from '@ncbijs/xml';
import { fetchJson } from './sra-client';
import type { SraClientConfig } from './sra-client';
import type {
  SraConfig,
  SraExperiment,
  SraOrganism,
  SraRun,
  SraSearchResult,
} from './interfaces/sra.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class Sra {
  private readonly _config: SraClientConfig;

  constructor(config?: SraConfig) {
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
  ): Promise<SraSearchResult> {
    const params = new URLSearchParams({
      db: 'sra',
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
  ): Promise<ReadonlyArray<SraExperiment>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<SraExperiment>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'sra',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const experiments: Array<SraExperiment> = [];

    for (const uid of uids) {
      const entry = getSraEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      experiments.push(mapSraExperiment(entry));
    }

    return experiments;
  }
}

function getSraEntry(result: RawESummaryResult, uid: string): RawSraEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawSraEntry;
}

function appendCredentials(params: URLSearchParams, config: SraClientConfig): void {
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

interface RawSraEntry {
  readonly uid?: string;
  readonly expxml?: string;
  readonly runs?: string;
  readonly createdate?: string;
  readonly updatedate?: string;
  readonly error?: string;
}

function mapSraExperiment(raw: RawSraEntry): SraExperiment {
  const expXml = raw.expxml ?? '';
  const runsXml = raw.runs ?? '';

  return {
    uid: raw.uid ?? '',
    title: readTag(expXml, 'Title') ?? '',
    experimentAccession: parseAttributeFromTag(expXml, 'Experiment', 'acc'),
    studyAccession: parseAttributeFromTag(expXml, 'Study', 'acc'),
    sampleAccession: parseAttributeFromTag(expXml, 'Sample', 'acc'),
    organism: parseOrganism(expXml),
    platform: readTag(expXml, 'Platform') ?? '',
    instrumentModel: parseAttributeFromTag(expXml, 'Platform', 'instrument_model'),
    libraryStrategy: readTag(expXml, 'LIBRARY_STRATEGY') ?? '',
    librarySource: readTag(expXml, 'LIBRARY_SOURCE') ?? '',
    librarySelection: readTag(expXml, 'LIBRARY_SELECTION') ?? '',
    libraryLayout: parseLibraryLayout(expXml),
    bioproject: readTag(expXml, 'Bioproject') ?? '',
    biosample: readTag(expXml, 'Biosample') ?? '',
    runs: parseRuns(runsXml),
    createDate: raw.createdate ?? '',
    updateDate: raw.updatedate ?? '',
  };
}

function parseAttributeFromTag(xml: string, tagName: string, attrName: string): string {
  const regex = new RegExp(`<${tagName}\\s[^>]*\\b${attrName}="([^"]*)"`);
  const match = regex.exec(xml);
  return match?.[1] ?? '';
}

function parseOrganism(xml: string): SraOrganism {
  const taxIdStr = parseAttributeFromTag(xml, 'Organism', 'taxid');
  const scientificName = parseAttributeFromTag(xml, 'Organism', 'ScientificName');

  return {
    taxId: Number(taxIdStr) || 0,
    scientificName,
  };
}

function parseLibraryLayout(xml: string): string {
  const block = readBlock(xml, 'LIBRARY_LAYOUT');

  if (block === undefined) {
    return '';
  }

  const layoutMatch = /<(\w+)\s*\/>/.exec(block);
  return layoutMatch?.[1] ?? '';
}

function parseRuns(xml: string): ReadonlyArray<SraRun> {
  return readAllBlocksWithAttributes(xml, 'Run').map((run) => ({
    accession: run.attributes['acc'] ?? '',
    totalSpots: Number(run.attributes['total_spots'] ?? '0') || 0,
    totalBases: Number(run.attributes['total_bases'] ?? '0') || 0,
    isPublic: run.attributes['is_public'] === 'true',
  }));
}
