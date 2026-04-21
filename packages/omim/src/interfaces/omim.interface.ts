/** Configuration options for the OMIM client. */
export interface OmimConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** OMIM search result containing matched entry IDs and total count. */
export interface OmimSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** An OMIM catalog entry representing a genetic disorder or gene. */
export interface OmimEntry {
  readonly uid: string;
  readonly mimNumber: string;
  readonly prefix: string;
  readonly title: string;
  readonly alternativeTitles: string;
  readonly geneMapLocus: string;
}
