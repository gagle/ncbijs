import type { PipelineResult, Sink } from '@ncbijs/pipeline';

export type EtlDatasetType =
  | 'mesh'
  | 'clinvar'
  | 'genes'
  | 'taxonomy'
  | 'compounds'
  | 'id-mappings';

export interface DatasetInfo {
  readonly id: EtlDatasetType;
  readonly name: string;
  readonly description: string;
  readonly sourceUrls: ReadonlyArray<string>;
  readonly format: 'xml' | 'tsv' | 'csv' | 'tar.gz';
  readonly compressed: boolean;
  readonly estimatedSize: string;
  readonly estimatedRecords: string;
  readonly updateFrequency: string;
}

export interface LoadOptions {
  readonly transform?: (records: ReadonlyArray<object>) => ReadonlyArray<object>;
  readonly signal?: AbortSignal;
  readonly batchSize?: number;
  readonly onProgress?: (event: { recordsProcessed: number; batchesWritten: number }) => void;
}

export interface LoadAllOptions {
  readonly datasets?: ReadonlyArray<EtlDatasetType>;
  readonly signal?: AbortSignal;
  readonly batchSize?: number;
  readonly onDatasetComplete?: (dataset: EtlDatasetType, result: PipelineResult) => void;
  readonly onError?: 'abort' | 'skip';
}

export interface LoadAllResult {
  readonly results: ReadonlyArray<DatasetLoadResult>;
  readonly totalDurationMs: number;
}

export interface DatasetLoadResult {
  readonly dataset: EtlDatasetType;
  readonly result?: PipelineResult;
  readonly error?: Error;
}

export type SinkFactory = (dataset: EtlDatasetType) => Sink<object>;
