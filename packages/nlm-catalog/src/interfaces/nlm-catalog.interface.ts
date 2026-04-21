/** Configuration options for the NLM Catalog client. */
export interface NlmCatalogConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** NLM Catalog search result containing matched record IDs and total count. */
export interface NlmCatalogSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** An NLM Catalog record representing a journal or bibliographic resource. */
export interface NlmCatalogRecord {
  readonly uid: string;
  readonly nlmUniqueId: string;
  readonly dateRevised: string;
  readonly title: string;
  readonly titleSort: string;
  readonly alternateTitles: ReadonlyArray<string>;
  readonly issns: ReadonlyArray<NlmCatalogIssn>;
  readonly isbn: string;
  readonly country: string;
  readonly currentIndexingStatus: string;
  readonly medlineAbbreviation: string;
  readonly isoAbbreviation: string;
  readonly startYear: string;
  readonly endYear: string;
  readonly journalId: string;
  readonly language: string;
  readonly continuationNotes: string;
  readonly resourceType: string;
}

/** An ISSN associated with an NLM Catalog record. */
export interface NlmCatalogIssn {
  readonly issn: string;
  readonly type: string;
}
