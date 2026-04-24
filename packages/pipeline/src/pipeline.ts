import type {
  BatchParser,
  ErrorStrategy,
  PipelineError,
  PipelineOptions,
  PipelineResult,
  Sink,
  Source,
  StreamParser,
} from './interfaces/pipeline.interface';
import { batchRecords } from './batch-records';
import { isStreamParser } from './stream-parser-tag';
import { PipelineAbortError } from './errors/pipeline-abort-error';

const DEFAULT_BATCH_SIZE = 10_000;
const MAX_RETRIES = 3;

/** Run a data pipeline: read from source, transform with parser, write to sink. */
export async function pipeline<TRaw, TRecord>(
  source: Source<TRaw>,
  parse: BatchParser<TRaw, TRecord> | StreamParser<TRaw, TRecord>,
  sink: Sink<NoInfer<TRecord>>,
  options?: PipelineOptions<TRecord>,
): Promise<PipelineResult> {
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const signal = options?.signal ?? new AbortController().signal;
  const onError = options?.onError ?? 'abort';
  const startTime = Date.now();

  try {
    const counters = isStreamParser(parse)
      ? await runStreamPipeline(
          source,
          parse,
          sink,
          batchSize,
          signal,
          onError,
          options?.onProgress,
        )
      : await runBatchPipeline(
          source,
          parse,
          sink,
          batchSize,
          signal,
          onError,
          options?.onProgress,
        );

    return {
      recordsProcessed: counters.recordsProcessed,
      recordsFailed: counters.recordsFailed,
      batchesWritten: counters.batchesWritten,
      durationMs: Date.now() - startTime,
    };
  } finally {
    await sink.close?.();
  }
}

async function runBatchPipeline<TRaw, TRecord>(
  source: Source<TRaw>,
  parse: BatchParser<TRaw, TRecord>,
  sink: Sink<TRecord>,
  batchSize: number,
  signal: AbortSignal,
  onError: ErrorStrategy<TRecord>,
  onProgress?: PipelineOptions<TRecord>['onProgress'],
): Promise<{ recordsProcessed: number; recordsFailed: number; batchesWritten: number }> {
  let recordsProcessed = 0;
  const recordsFailed = 0;
  let batchesWritten = 0;

  const raw = await collectSource(source, signal);
  checkAborted(signal);

  let records: ReadonlyArray<TRecord>;

  try {
    records = parse(raw);
  } catch (error) {
    handlePhaseError('parse', error, onError, 0);
    return { recordsProcessed: 0, recordsFailed: 0, batchesWritten: 0 };
  }

  const startTime = Date.now();

  for (let offset = 0; offset < records.length; offset += batchSize) {
    checkAborted(signal);
    const batch = records.slice(offset, offset + batchSize);

    await writeBatchWithRetry(sink, batch, batchesWritten, onError);
    recordsProcessed += batch.length;
    batchesWritten++;

    onProgress?.({
      phase: 'write',
      recordsProcessed,
      batchesWritten,
      elapsedMs: Date.now() - startTime,
    });
  }

  return { recordsProcessed, recordsFailed, batchesWritten };
}

async function runStreamPipeline<TChunk, TRecord>(
  source: Source<TChunk>,
  parse: StreamParser<TChunk, TRecord>,
  sink: Sink<TRecord>,
  batchSize: number,
  signal: AbortSignal,
  onError: ErrorStrategy<TRecord>,
  onProgress?: PipelineOptions<TRecord>['onProgress'],
): Promise<{ recordsProcessed: number; recordsFailed: number; batchesWritten: number }> {
  let recordsProcessed = 0;
  let recordsFailed = 0;
  let batchesWritten = 0;

  const chunks = source.open(signal);
  const records = parse(chunks);
  const startTime = Date.now();

  for await (const batch of batchRecords(records, batchSize)) {
    checkAborted(signal);

    try {
      await writeBatchWithRetry(sink, batch, batchesWritten, onError);
      recordsProcessed += batch.length;
    } catch (error) {
      if (resolveAction(onError, 'write', error, undefined, batchesWritten, 0) === 'skip') {
        recordsFailed += batch.length;
      } else {
        throw error;
      }
    }

    batchesWritten++;

    onProgress?.({
      phase: 'write',
      recordsProcessed,
      batchesWritten,
      elapsedMs: Date.now() - startTime,
    });
  }

  return { recordsProcessed, recordsFailed, batchesWritten };
}

async function collectSource<T>(source: Source<T>, signal: AbortSignal): Promise<T> {
  let accumulated: T | undefined;
  let isString = false;

  for await (const chunk of source.open(signal)) {
    if (accumulated === undefined) {
      accumulated = chunk;
      isString = typeof chunk === 'string';
    } else if (isString) {
      accumulated = ((accumulated as string) + (chunk as string)) as T;
    } else {
      accumulated = chunk;
    }
  }

  if (accumulated === undefined) {
    throw new PipelineAbortError('source', new Error('Source produced no data'));
  }

  return accumulated;
}

async function writeBatchWithRetry<T>(
  sink: Sink<T>,
  batch: ReadonlyArray<T>,
  batchIndex: number,
  onError: ErrorStrategy<T>,
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sink.write(batch);
      return;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        handlePhaseError('write', error, onError, batchIndex);
        return;
      }

      const action = resolveAction(onError, 'write', error, undefined, batchIndex, attempt);

      if (action === 'retry') {
        continue;
      }

      if (action === 'skip') {
        return;
      }

      throw new PipelineAbortError('write', error);
    }
  }
}

function handlePhaseError<T>(
  phase: 'source' | 'parse' | 'write',
  error: unknown,
  onError: ErrorStrategy<T>,
  batchIndex: number,
): void {
  const action = resolveAction(onError, phase, error, undefined, batchIndex, MAX_RETRIES);

  if (action === 'abort') {
    throw new PipelineAbortError(phase, error);
  }
}

function resolveAction<T>(
  strategy: ErrorStrategy<T>,
  phase: 'source' | 'parse' | 'write',
  cause: unknown,
  record: T | undefined,
  batchIndex: number,
  retryCount: number,
): 'retry' | 'skip' | 'abort' {
  if (strategy === 'abort') {
    return 'abort';
  }

  if (strategy === 'skip') {
    return 'skip';
  }

  const pipelineError: PipelineError<T> = {
    phase,
    cause,
    record,
    batchIndex,
    retryCount,
  };

  return strategy(pipelineError);
}

function checkAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new PipelineAbortError('source', signal.reason ?? new Error('Pipeline aborted'));
  }
}
