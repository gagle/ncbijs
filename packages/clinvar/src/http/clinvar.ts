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
  FrequencyReport,
  PopulationFrequency,
  RefSnpAllele,
  RefSnpPlacement,
  RefSnpReport,
  SpdiAllele,
  TraitXref,
  VariantLocation,
  VariantReport,
} from './interfaces/clinvar.interface';

const VARIATION_BASE_URL = 'https://api.ncbi.nlm.nih.gov/variation/v0';

/** ClinVar variant database client for searching and fetching variant reports. */
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

  /** Search ClinVar by term and return matching variant IDs. */
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

  /** Search ClinVar by term and fetch full variant reports for all matches. */
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

  /** Fetch full variant reports by ClinVar UIDs. */
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

  /** Get a RefSNP report by rsID from the Variation Services API. */
  public async refsnp(rsid: number): Promise<RefSnpReport> {
    const url = `${VARIATION_BASE_URL}/refsnp/${rsid}`;
    const raw = await fetchJson<RawRefSnpResponse>(url, this._config);

    return mapRefSnpReport(rsid, raw);
  }

  /** Validate and resolve an SPDI expression via the Variation Services API. */
  public async spdi(spdiExpression: string): Promise<SpdiAllele> {
    const url = `${VARIATION_BASE_URL}/spdi/${encodeURIComponent(spdiExpression)}`;
    const raw = await fetchJson<RawSpdiResponse>(url, this._config);

    return mapSpdiResult(raw);
  }

  /** Convert an SPDI expression to HGVS notation via the Variation Services API. */
  public async spdiToHgvs(spdiExpression: string): Promise<ReadonlyArray<string>> {
    const url = `${VARIATION_BASE_URL}/spdi/${encodeURIComponent(spdiExpression)}/hgvs`;
    const raw = await fetchJson<RawSpdiHgvsResponse>(url, this._config);

    return raw.data?.hgvsExpression ?? [];
  }

  /** Convert an HGVS expression to contextual SPDI alleles via the Variation Services API. */
  public async hgvsToSpdi(
    hgvsExpression: string,
    assembly?: string,
  ): Promise<ReadonlyArray<SpdiAllele>> {
    let url = `${VARIATION_BASE_URL}/hgvs/${encodeURIComponent(hgvsExpression)}/contextuals`;

    if (assembly !== undefined) {
      url += `?assembly=${encodeURIComponent(assembly)}`;
    }

    const raw = await fetchJson<RawHgvsContextualsResponse>(url, this._config);

    return (raw.data?.spdis ?? []).map(mapSpdiAllele);
  }

  /** Get allele frequency data for a variant by rsID from the Variation Services API. */
  public async frequency(rsid: number): Promise<FrequencyReport> {
    const url = `${VARIATION_BASE_URL}/refsnp/${rsid}/frequency`;
    const raw = await fetchJson<RawFrequencyResponse>(url, this._config);

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
    readonly hgvsExpression?: ReadonlyArray<string>;
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
  readonly results?: ReadonlyArray<RawFrequencyResult>;
}

interface RawFrequencyResult {
  readonly study?: string;
  readonly populations?: ReadonlyArray<RawPopulationFrequency>;
}

interface RawPopulationFrequency {
  readonly population?: string;
  readonly allele_count?: number;
  readonly total_count?: number;
  readonly frequency?: number;
}

function mapFrequencyReport(rsid: number, raw: RawFrequencyResponse): FrequencyReport {
  const populations: Array<PopulationFrequency> = [];

  for (const result of raw.results ?? []) {
    const study = result.study ?? '';

    for (const pop of result.populations ?? []) {
      populations.push({
        study,
        population: pop.population ?? '',
        alleleCount: pop.allele_count ?? 0,
        totalCount: pop.total_count ?? 0,
        frequency: pop.frequency ?? 0,
      });
    }
  }

  return { rsid, populations };
}
