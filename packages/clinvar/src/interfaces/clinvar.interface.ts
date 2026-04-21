/** Configuration for the ClinVar client. */
export interface ClinVarConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** ClinVar search result with total count and matching variant IDs. */
export interface ClinVarSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** ClinVar variant report with clinical significance, genes, traits, and locations. */
export interface VariantReport {
  readonly uid: string;
  readonly title: string;
  readonly objectType: string;
  readonly accession: string;
  readonly accessionVersion: string;
  readonly clinicalSignificance: string;
  readonly genes: ReadonlyArray<ClinVarGene>;
  readonly traits: ReadonlyArray<ClinVarTrait>;
  readonly locations: ReadonlyArray<VariantLocation>;
  readonly supportingSubmissions: ReadonlyArray<string>;
}

/** Gene associated with a ClinVar variant. */
export interface ClinVarGene {
  readonly geneId: number;
  readonly symbol: string;
}

/** Clinical trait associated with a ClinVar variant. */
export interface ClinVarTrait {
  readonly name: string;
  readonly xrefs: ReadonlyArray<TraitXref>;
}

/** Cross-reference to an external database for a ClinVar trait. */
export interface TraitXref {
  readonly dbSource: string;
  readonly dbId: string;
}

/** Genomic location of a ClinVar variant on a specific assembly. */
export interface VariantLocation {
  readonly assemblyName: string;
  readonly chromosome: string;
  readonly start: number;
  readonly stop: number;
}
