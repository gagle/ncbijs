/** Variant details returned by the LitVar API. */
export interface LitVarVariant {
  readonly rsid: string;
  readonly hgvs: ReadonlyArray<string>;
  readonly gene: string;
  readonly publicationCount: number;
}

/** A publication mentioning a genetic variant. */
export interface LitVarPublication {
  readonly pmid: number;
  readonly title: string;
  readonly journal: string;
  readonly year: number;
}
