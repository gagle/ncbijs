/** Supported article identifier type. */
export type IdType = 'pmid' | 'pmcid' | 'doi' | 'mid';

/** Response format for the ID Converter API. */
export type OutputFormat = 'json' | 'xml' | 'csv' | 'html';

/** Parameters for an ID conversion request. */
export interface ConvertParams {
  readonly ids: ReadonlyArray<string>;
  readonly idtype?: IdType;
  readonly versions?: boolean;
  readonly showaiid?: boolean;
  readonly format?: OutputFormat;
  readonly tool?: string;
  readonly email?: string;
}

/** A PMCID version entry with its currency flag. */
export interface VersionedId {
  readonly pmcid: string;
  readonly current: boolean;
}

/** Configuration for the ID Converter client. */
export interface IdConverterConfig {
  readonly maxRetries?: number;
}

/** Result of converting an article identifier across PMID, PMCID, DOI, and MID. */
export interface ConvertedId {
  readonly pmid: string | null;
  readonly pmcid: string | null;
  readonly doi: string | null;
  readonly mid?: string;
  readonly versions?: ReadonlyArray<Readonly<VersionedId>>;
  readonly aiid?: string;
}
