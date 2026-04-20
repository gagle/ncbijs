export interface CddConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface CddSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

export interface CddRecord {
  readonly uid: string;
  readonly accession: string;
  readonly title: string;
  readonly subtitle: string;
  readonly abstract: string;
  readonly database: string;
  readonly organism: string;
  readonly publicationDate: string;
  readonly entrezDate: string;
  readonly pssmLength: number;
  readonly structureRepresentative: string;
  readonly numberOfSites: number;
  readonly siteDescriptions: ReadonlyArray<string>;
  readonly status: string;
  readonly livePssmId: string;
}
