/** Options for searching a Clinical Tables resource. */
export interface ClinicalTablesSearchOptions {
  readonly maxList?: number;
  readonly count?: number;
  readonly offset?: number;
  readonly extraFields?: ReadonlyArray<string>;
}

/** Search result from the Clinical Tables API. */
export interface ClinicalTablesResult {
  readonly totalCount: number;
  readonly codes: ReadonlyArray<string>;
  readonly displayStrings: ReadonlyArray<string>;
  readonly extras: ReadonlyArray<ReadonlyArray<string>>;
}

/** Configuration for the Clinical Tables client. */
export interface ClinicalTablesConfig {
  readonly maxRetries?: number;
}
