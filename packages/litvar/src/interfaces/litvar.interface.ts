export interface LitVarVariant {
  readonly rsid: string;
  readonly hgvs: ReadonlyArray<string>;
  readonly gene: string;
  readonly publicationCount: number;
}

export interface LitVarPublication {
  readonly pmid: number;
  readonly title: string;
  readonly journal: string;
  readonly year: number;
}
