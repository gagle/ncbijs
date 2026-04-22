/** Supported dataset types for offline storage. */
export type DatasetType = 'mesh' | 'clinvar' | 'genes' | 'taxonomy' | 'compounds' | 'id-mappings';

/** Query parameters for searching records in a dataset. */
export interface SearchQuery {
  readonly field: string;
  readonly value: string;
  readonly operator?: 'eq' | 'contains' | 'starts_with';
  readonly limit?: number;
}

/** Statistics for a single dataset in storage. */
export interface DatasetStats {
  readonly dataset: DatasetType;
  readonly recordCount: number;
  readonly sizeBytes: number;
  readonly lastUpdated?: string;
}

/** Base storage contract for reading and writing NCBI dataset records. */
export interface Storage {
  readonly writeRecords: (dataset: DatasetType, records: ReadonlyArray<unknown>) => Promise<void>;
  readonly getRecord: <T>(dataset: DatasetType, key: string) => Promise<T | undefined>;
  readonly searchRecords: <T>(
    dataset: DatasetType,
    query: SearchQuery,
  ) => Promise<ReadonlyArray<T>>;
  readonly getStats: () => Promise<ReadonlyArray<DatasetStats>>;
}

/** File-based storage with filesystem lifecycle concerns. */
export interface FileStorage extends Storage {
  readonly path: string;
  readonly close: () => Promise<void>;
}

/** Cloud-based storage with connection lifecycle concerns. */
export interface CloudStorage extends Storage {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}
