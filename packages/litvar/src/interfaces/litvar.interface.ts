/** Variant details returned by the LitVar2 variant detail endpoint. */
export interface LitVarVariant {
  readonly rsid: string;
  readonly gene: ReadonlyArray<string>;
  readonly name: string;
  readonly hgvs: string;
  readonly clinicalSignificance: ReadonlyArray<string>;
}

/** Publication IDs associated with a variant. */
export interface LitVarPublicationResult {
  readonly pmids: ReadonlyArray<number>;
  readonly pmcids: ReadonlyArray<string>;
  readonly count: number;
}

/** A variant autocomplete result from the LitVar2 search endpoint. */
export interface LitVarSearchResult {
  readonly rsid: string;
  readonly gene: ReadonlyArray<string>;
  readonly name: string;
  readonly hgvs: string;
  readonly publicationCount: number;
  readonly clinicalSignificance: ReadonlyArray<string>;
  readonly match: string;
}

/** Configuration for the LitVar client. */
export interface LitVarConfig {
  readonly maxRetries?: number;
}
