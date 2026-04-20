export interface ClinVarConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface ClinVarSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

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

export interface ClinVarGene {
  readonly geneId: number;
  readonly symbol: string;
}

export interface ClinVarTrait {
  readonly name: string;
  readonly xrefs: ReadonlyArray<TraitXref>;
}

export interface TraitXref {
  readonly dbSource: string;
  readonly dbId: string;
}

export interface VariantLocation {
  readonly assemblyName: string;
  readonly chromosome: string;
  readonly start: number;
  readonly stop: number;
}
