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

/** A variant entity returned by the LitVar search endpoint. */
export interface LitVarSearchResult {
  readonly term: string;
  readonly type: string;
  readonly score: number;
}

/** An annotation for a variant (disease association, related genes, supporting PMIDs). */
export interface LitVarAnnotation {
  readonly disease: string;
  readonly genes: ReadonlyArray<string>;
  readonly pmids: ReadonlyArray<number>;
}

/** Configuration for the LitVar client. */
export interface LitVarConfig {
  readonly maxRetries?: number;
}
