/** Configuration options for the dbVar client. */
export interface DbVarConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** dbVar search result containing matched record IDs and total count. */
export interface DbVarSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A dbVar structural variant or study record. */
export interface DbVarRecord {
  readonly uid: string;
  readonly objectType: string;
  readonly studyAccession: string;
  readonly variantAccession: string;
  readonly studyType: string;
  readonly variantCount: number;
  readonly taxId: number;
  readonly organism: string;
  readonly placements: ReadonlyArray<DbVarPlacement>;
  readonly genes: ReadonlyArray<DbVarGene>;
  readonly methods: ReadonlyArray<string>;
  readonly clinicalSignificances: ReadonlyArray<string>;
  readonly variantTypes: ReadonlyArray<string>;
  readonly variantCallCount: number;
}

/** Chromosomal placement of a dbVar structural variant. */
export interface DbVarPlacement {
  readonly chromosome: string;
  readonly start: number;
  readonly end: number;
  readonly assembly: string;
}

/** A gene overlapping a dbVar structural variant. */
export interface DbVarGene {
  readonly id: number;
  readonly name: string;
}
