/** A data source that produces an async stream of chunks. */
export interface Source<T> {
  readonly open: (signal: AbortSignal) => AsyncIterable<T>;
}

/** A data sink that receives batches of records. */
export interface Sink<T> {
  readonly write: (records: ReadonlyArray<T>) => Promise<void>;
  readonly close?: () => Promise<void>;
}

/** A synchronous batch parser: receives complete input, returns all records. */
export type BatchParser<TRaw, TRecord> = (raw: TRaw) => ReadonlyArray<TRecord>;

/** A streaming parser: receives an async stream of chunks, yields records incrementally. */
export type StreamParser<TChunk, TRecord> = ((
  input: AsyncIterable<TChunk>,
) => AsyncIterable<TRecord>) & { readonly [streamTag]: true };

/** Symbol used to tag streaming parsers for runtime dispatch. */
export const streamTag: unique symbol = Symbol('streamParser');

/** Options controlling pipeline execution behavior. */
export interface PipelineOptions<T> {
  readonly batchSize?: number;
  readonly signal?: AbortSignal;
  readonly onError?: ErrorStrategy<T>;
  readonly onProgress?: (event: ProgressEvent) => void;
}

/** Error handling strategy: a callback or a shorthand string. */
export type ErrorStrategy<T> =
  | 'abort'
  | 'skip'
  | ((error: PipelineError<T>) => 'retry' | 'skip' | 'abort');

/** Error context provided to the error strategy callback. */
export interface PipelineError<T> {
  readonly phase: 'source' | 'parse' | 'write';
  readonly cause: unknown;
  readonly record?: T | undefined;
  readonly batchIndex: number;
  readonly retryCount: number;
}

/** Progress event emitted after each batch write. */
export interface ProgressEvent {
  readonly phase: 'parse' | 'write';
  readonly recordsProcessed: number;
  readonly batchesWritten: number;
  readonly elapsedMs: number;
}

/** Summary statistics returned after a pipeline run completes. */
export interface PipelineResult {
  readonly recordsProcessed: number;
  readonly recordsFailed: number;
  readonly batchesWritten: number;
  readonly durationMs: number;
}
