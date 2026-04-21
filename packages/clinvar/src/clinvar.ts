import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from '@ncbijs/eutils/config';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './clinvar-client';
import type { ClinVarClientConfig } from './clinvar-client';
import type {
  ClinVarConfig,
  ClinVarGene,
  ClinVarSearchResult,
  ClinVarTrait,
  TraitXref,
  VariantLocation,
  VariantReport,
} from './interfaces/clinvar.interface';

export class ClinVar {
  private readonly _config: ClinVarClientConfig;

  constructor(config?: ClinVarConfig) {
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

  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ClinVarSearchResult> {
    const params = new URLSearchParams({
      db: 'clinvar',
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

  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<VariantReport>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<VariantReport>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'clinvar',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const reports: Array<VariantReport> = [];

    for (const uid of uids) {
      const entry = getVariantEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      reports.push(mapVariantReport(entry));
    }

    return reports;
  }
}

function getVariantEntry(result: RawESummaryResult, uid: string): RawVariantEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawVariantEntry;
}

interface RawESearchResponse {
  readonly esearchresult?: {
    readonly count?: string;
    readonly retmax?: string;
    readonly retstart?: string;
    readonly idlist?: ReadonlyArray<string>;
  };
}

interface RawESummaryResponse {
  readonly result?: RawESummaryResult;
}

type RawESummaryResult = Record<string, unknown> & {
  readonly uids?: ReadonlyArray<string>;
};

interface RawVariantEntry {
  readonly uid?: string;
  readonly title?: string;
  readonly obj_type?: string;
  readonly accession?: string;
  readonly accession_version?: string;
  readonly clinical_significance?: { readonly description?: string };
  readonly gene_sort?: string;
  readonly genes?: ReadonlyArray<RawGene>;
  readonly trait_set?: ReadonlyArray<RawTraitSet>;
  readonly variation_set?: ReadonlyArray<RawVariationSet>;
  readonly supporting_submissions?: { readonly scv?: ReadonlyArray<string> };
  readonly error?: string;
}

interface RawGene {
  readonly geneid?: number;
  readonly symbol?: string;
}

interface RawTraitSet {
  readonly trait_name?: string;
  readonly trait_xrefs?: ReadonlyArray<RawTraitXref>;
}

interface RawTraitXref {
  readonly db_source?: string;
  readonly db_id?: string;
}

interface RawVariationSet {
  readonly variation_loc?: ReadonlyArray<RawVariationLocation>;
}

interface RawVariationLocation {
  readonly assembly_name?: string;
  readonly chr?: string;
  readonly start?: number;
  readonly stop?: number;
}

function mapVariantReport(raw: RawVariantEntry): VariantReport {
  return {
    uid: raw.uid ?? '',
    title: raw.title ?? '',
    objectType: raw.obj_type ?? '',
    accession: raw.accession ?? '',
    accessionVersion: raw.accession_version ?? '',
    clinicalSignificance: raw.clinical_significance?.description ?? '',
    genes: (raw.genes ?? []).map(mapGene),
    traits: (raw.trait_set ?? []).map(mapTrait),
    locations: flatMapLocations(raw.variation_set ?? []),
    supportingSubmissions: raw.supporting_submissions?.scv ?? [],
  };
}

function mapGene(raw: RawGene): ClinVarGene {
  return {
    geneId: raw.geneid ?? 0,
    symbol: raw.symbol ?? '',
  };
}

function mapTrait(raw: RawTraitSet): ClinVarTrait {
  return {
    name: raw.trait_name ?? '',
    xrefs: (raw.trait_xrefs ?? []).map(mapTraitXref),
  };
}

function mapTraitXref(raw: RawTraitXref): TraitXref {
  return {
    dbSource: raw.db_source ?? '',
    dbId: raw.db_id ?? '',
  };
}

function flatMapLocations(
  variationSets: ReadonlyArray<RawVariationSet>,
): ReadonlyArray<VariantLocation> {
  return variationSets.flatMap((variationSet) =>
    (variationSet.variation_loc ?? []).map(mapLocation),
  );
}

function mapLocation(raw: RawVariationLocation): VariantLocation {
  return {
    assemblyName: raw.assembly_name ?? '',
    chromosome: raw.chr ?? '',
    start: raw.start ?? 0,
    stop: raw.stop ?? 0,
  };
}
