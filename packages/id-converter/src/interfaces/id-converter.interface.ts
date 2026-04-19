export type IdType = 'pmid' | 'pmcid' | 'doi' | 'mid';

export type OutputFormat = 'json' | 'xml' | 'csv' | 'html';

export interface ConvertParams {
  readonly ids: ReadonlyArray<string>;
  readonly idtype?: IdType;
  readonly versions?: boolean;
  readonly showaiid?: boolean;
  readonly format?: OutputFormat;
  readonly tool?: string;
  readonly email?: string;
}

export interface VersionedId {
  readonly pmcid: string;
  readonly current: boolean;
}

export interface ConvertedId {
  readonly pmid: string | null;
  readonly pmcid: string | null;
  readonly doi: string | null;
  readonly mid: string | null;
  readonly live: boolean;
  readonly releaseDate: string;
  readonly versions?: ReadonlyArray<Readonly<VersionedId>>;
  readonly aiid?: string;
}
