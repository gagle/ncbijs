/** Configuration options for the CDD client. */
export interface CddConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** CDD search result containing matched domain IDs and total count. */
export interface CddSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A conserved domain record with PSSM and structure metadata. */
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
