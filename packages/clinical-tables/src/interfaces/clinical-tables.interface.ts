export interface ClinicalTablesSearchOptions {
  readonly maxList?: number;
  readonly count?: number;
  readonly offset?: number;
  readonly extraFields?: ReadonlyArray<string>;
}

export interface ClinicalTablesResult {
  readonly totalCount: number;
  readonly codes: ReadonlyArray<string>;
  readonly displayStrings: ReadonlyArray<string>;
  readonly extras: ReadonlyArray<ReadonlyArray<string>>;
}
