export interface OmimConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface OmimSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

export interface OmimEntry {
  readonly uid: string;
  readonly mimNumber: string;
  readonly prefix: string;
  readonly title: string;
  readonly alternativeTitles: string;
  readonly geneMapLocus: string;
}
