export interface DbVarConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface DbVarSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

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

export interface DbVarPlacement {
  readonly chromosome: string;
  readonly start: number;
  readonly end: number;
  readonly assembly: string;
}

export interface DbVarGene {
  readonly id: number;
  readonly name: string;
}
