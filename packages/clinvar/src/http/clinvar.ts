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
  AlleleFrequency,
  ClinVarConfig,
  ClinVarGene,
  ClinVarSearchResult,
  ClinVarTrait,
  DataStorage,
  FrequencyReport,
  PopulationFrequency,
  RefSnpAllele,
  RefSnpPlacement,
  RefSnpReport,
  SpdiAllele,
  TraitXref,
  VariantLocation,
  VariantReport,
} from '../interfaces/clinvar.interface';
import { StorageModeError } from '../interfaces/clinvar.interface';

const VARIATION_BASE_URL = 'https://api.ncbi.nlm.nih.gov/variation/v0';

/** ClinVar variant database client for searching and fetching variant reports. */
export class ClinVar {
  private readonly _config: ClinVarClientConfig | undefined;
  private readonly _storage: DataStorage | undefined;

  constructor(config?: ClinVarConfig) {
    this._storage = undefined;

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

  /**
   * Create a ClinVar instance backed by local storage instead of E-utilities HTTP APIs.
   *
   * Methods with corresponding stored data (`searchAndFetch`, `fetch`)
   * query the storage directly. All other methods throw a `StorageModeError`.
   *
   * @param storage - Any object implementing the `DataStorage` interface.
   *   `ReadableStorage` from `@ncbijs/store` satisfies this interface.
   */
  public static fromStorage(storage: DataStorage): ClinVar {
    const instance = Object.create(ClinVar.prototype) as ClinVar;
    Object.defineProperty(instance, '_storage', { value: storage, enumerable: true });
    Object.defineProperty(instance, '_config', { value: undefined, enumerable: true });
    return instance;
  }

  /** Search ClinVar by term and return matching variant IDs. */
  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ClinVarSearchResult> {
    if (this._storage !== undefined) {
      throw new StorageModeError('search');
    }

    const params = new URLSearchParams({
      db: 'clinvar',
      term,
      retmode: 'json',
    });

    if (options?.retmax !== undefined) {
      params.set('retmax', String(options.retmax));
    }

    appendEUtilsCredentials(params, this._config!);

    const url = `${EUTILS_BASE_URL}/esearch.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESearchResponse>(url, this._config!);

    return {
      total: Number(raw.esearchresult?.count ?? '0'),
      ids: raw.esearchresult?.idlist ?? [],
    };
  }

  /** Search ClinVar by term and fetch full variant reports for all matches. */
  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<VariantReport>> {
    if (this._storage !== undefined) {
      const limit = options?.retmax ?? 20;
      const byTitle = await this._storage.searchRecords<VariantReport>('clinvar', {
        field: 'title',
        value: term,
        operator: 'contains',
        limit,
      });
      const byGenes = await this._storage.searchRecords<VariantReport>('clinvar', {
        field: 'genes',
        value: term,
        operator: 'contains',
        limit,
      });
      const seen = new Set<string>();
      const merged: Array<VariantReport> = [];
      for (const report of [...byTitle, ...byGenes]) {
        if (!seen.has(report.uid)) {
          seen.add(report.uid);
          merged.push(report);
        }
      }
      return merged.slice(0, limit);
    }

    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  /** Fetch full variant reports by ClinVar UIDs. */
  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<VariantReport>> {
    if (ids.length === 0) {
      return [];
    }

    if (this._storage !== undefined) {
      const results: Array<VariantReport> = [];
      for (const uid of ids) {
        const record = await this._storage.getRecord<VariantReport>('clinvar', uid);
        if (record !== undefined) {
          results.push(record);
        }
      }
      return results;
    }

    const params = new URLSearchParams({
      db: 'clinvar',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config!);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config!);

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

  /** Get a RefSNP report by rsID from the Variation Services API. */
  public async refsnp(rsid: number): Promise<RefSnpReport> {
    if (this._storage !== undefined) {
      throw new StorageModeError('refsnp');
    }

    const url = `${VARIATION_BASE_URL}/refsnp/${rsid}`;
    const raw = await fetchJson<RawRefSnpResponse>(url, this._config!);

    return mapRefSnpReport(rsid, raw);
  }

  /** Validate and resolve an SPDI expression via the Variation Services API. */
  public async spdi(spdiExpression: string): Promise<SpdiAllele> {
    if (this._storage !== undefined) {
      throw new StorageModeError('spdi');
    }

    const url = `${VARIATION_BASE_URL}/spdi/${encodeURIComponent(spdiExpression)}`;
    const raw = await fetchJson<RawSpdiResponse>(url, this._config!);

    return mapSpdiResult(raw);
  }

  /** Convert an SPDI expression to HGVS notation via the Variation Services API. */
  public async spdiToHgvs(spdiExpression: string): Promise<string> {
    if (this._storage !== undefined) {
      throw new StorageModeError('spdiToHgvs');
    }

    const url = `${VARIATION_BASE_URL}/spdi/${encodeURIComponent(spdiExpression)}/hgvs`;
    const raw = await fetchJson<RawSpdiHgvsResponse>(url, this._config!);

    return raw.data?.hgvs ?? '';
  }

  /** Convert an HGVS expression to contextual SPDI alleles via the Variation Services API. */
  public async hgvsToSpdi(
    hgvsExpression: string,
    assembly?: string,
  ): Promise<ReadonlyArray<SpdiAllele>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('hgvsToSpdi');
    }

    let url = `${VARIATION_BASE_URL}/hgvs/${encodeURIComponent(hgvsExpression)}/contextuals`;

    if (assembly !== undefined) {
      url += `?assembly=${encodeURIComponent(assembly)}`;
    }

    const raw = await fetchJson<RawHgvsContextualsResponse>(url, this._config!);

    return (raw.data?.spdis ?? []).map(mapSpdiAllele);
  }

  /** Get allele frequency data for a variant by rsID from the Variation Services API. */
  public async frequency(rsid: number): Promise<FrequencyReport> {
    if (this._storage !== undefined) {
      throw new StorageModeError('frequency');
    }

    const url = `${VARIATION_BASE_URL}/refsnp/${rsid}/frequency`;
    const raw = await fetchJson<RawFrequencyResponse>(url, this._config!);

    return mapFrequencyReport(rsid, raw);
  }
}

function isRawVariantEntry(value: unknown): value is RawVariantEntry {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getVariantEntry(result: RawESummaryResult, uid: string): RawVariantEntry | undefined {
  const entry: unknown = result[uid];

  if (!isRawVariantEntry(entry)) {
    return undefined;
  }

  return entry;
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
  readonly germline_classification?: {
    readonly description?: string;
    readonly last_evaluated?: string;
    readonly review_status?: string;
    readonly trait_set?: ReadonlyArray<RawTraitSet>;
  };
  readonly gene_sort?: string;
  readonly genes?: ReadonlyArray<RawGene>;
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
  readonly start?: string | number;
  readonly stop?: string | number;
}

function mapVariantReport(raw: RawVariantEntry): VariantReport {
  const classification = raw.germline_classification;

  return {
    uid: raw.uid ?? '',
    title: raw.title ?? '',
    objectType: raw.obj_type ?? '',
    accession: raw.accession ?? '',
    accessionVersion: raw.accession_version ?? '',
    clinicalSignificance: classification?.description ?? '',
    reviewStatus: classification?.review_status ?? '',
    lastEvaluated: classification?.last_evaluated ?? '',
    genes: (raw.genes ?? []).map(mapGene),
    traits: (classification?.trait_set ?? []).map(mapTrait),
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
    start: Number(raw.start ?? 0) || 0,
    stop: Number(raw.stop ?? 0) || 0,
  };
}

interface RawRefSnpResponse {
  readonly primary_snapshot_data?: {
    readonly variant_type?: string;
    readonly placements_with_allele?: ReadonlyArray<RawRefSnpPlacement>;
  };
}

interface RawRefSnpPlacement {
  readonly seq_id?: string;
  readonly alleles?: ReadonlyArray<RawRefSnpAllele>;
}

interface RawRefSnpAllele {
  readonly allele?: {
    readonly spdi?: {
      readonly seq_id?: string;
      readonly position?: number;
      readonly deleted_sequence?: string;
      readonly inserted_sequence?: string;
    };
  };
  readonly hgvs?: string;
}

function mapRefSnpReport(rsid: number, raw: RawRefSnpResponse): RefSnpReport {
  const snapshot = raw.primary_snapshot_data;

  return {
    rsid,
    variantType: snapshot?.variant_type ?? '',
    placements: (snapshot?.placements_with_allele ?? []).map(mapRefSnpPlacement),
  };
}

function mapRefSnpPlacement(raw: RawRefSnpPlacement): RefSnpPlacement {
  return {
    sequenceAccession: raw.seq_id ?? '',
    alleles: (raw.alleles ?? []).map(mapRefSnpAllele),
  };
}

function mapRefSnpAllele(raw: RawRefSnpAllele): RefSnpAllele {
  const spdi = raw.allele?.spdi;
  const spdiString =
    spdi !== undefined
      ? `${spdi.seq_id ?? ''}:${spdi.position ?? 0}:${spdi.deleted_sequence ?? ''}:${spdi.inserted_sequence ?? ''}`
      : '';

  return {
    spdi: spdiString,
    hgvs: raw.hgvs ?? '',
  };
}

interface RawSpdiResponse {
  readonly data?: {
    readonly seq_id?: string;
    readonly position?: number;
    readonly deleted_sequence?: string;
    readonly inserted_sequence?: string;
  };
}

function mapSpdiResult(raw: RawSpdiResponse): SpdiAllele {
  const data = raw.data;

  return {
    sequenceAccession: data?.seq_id ?? '',
    position: data?.position ?? 0,
    deletedSequence: data?.deleted_sequence ?? '',
    insertedSequence: data?.inserted_sequence ?? '',
  };
}

interface RawSpdiHgvsResponse {
  readonly data?: {
    readonly hgvs?: string;
  };
}

interface RawHgvsContextualsResponse {
  readonly data?: {
    readonly spdis?: ReadonlyArray<RawSpdiEntry>;
  };
}

interface RawSpdiEntry {
  readonly seq_id?: string;
  readonly position?: number;
  readonly deleted_sequence?: string;
  readonly inserted_sequence?: string;
}

function mapSpdiAllele(raw: RawSpdiEntry): SpdiAllele {
  return {
    sequenceAccession: raw.seq_id ?? '',
    position: raw.position ?? 0,
    deletedSequence: raw.deleted_sequence ?? '',
    insertedSequence: raw.inserted_sequence ?? '',
  };
}

interface RawFrequencyResponse {
  readonly results?: Readonly<
    Record<
      string,
      {
        readonly ref?: string;
        readonly counts?: Readonly<
          Record<
            string,
            { readonly allele_counts?: Readonly<Record<string, Readonly<Record<string, number>>>> }
          >
        >;
      }
    >
  >;
}

function mapFrequencyReport(rsid: number, raw: RawFrequencyResponse): FrequencyReport {
  const alleles: Array<AlleleFrequency> = [];

  for (const [alleleId, alleleData] of Object.entries(raw.results ?? {})) {
    const populations: Array<PopulationFrequency> = [];

    for (const [study, studyData] of Object.entries(alleleData.counts ?? {})) {
      for (const [biosample, alleleCounts] of Object.entries(studyData.allele_counts ?? {})) {
        const total = Object.values(alleleCounts).reduce((sum, count) => sum + count, 0);
        populations.push({
          study,
          biosample,
          alleleCounts: { ...alleleCounts },
          totalCount: total,
        });
      }
    }

    alleles.push({
      alleleId,
      referenceAllele: alleleData.ref ?? '',
      populations,
    });
  }

  return { rsid, alleles };
}
