import type { Sink } from '../interfaces/pipeline.interface';

/** Options for creating a custom sink. */
export interface CreateSinkOptions<T> {
  readonly write: (records: ReadonlyArray<T>) => Promise<void>;
  readonly close?: () => Promise<void>;
}

/** Create a custom sink from an async callback or options object. */
export function createSink<T>(
  writeOrOptions: ((records: ReadonlyArray<T>) => Promise<void>) | CreateSinkOptions<T>,
): Sink<T> {
  if (typeof writeOrOptions === 'function') {
    return { write: writeOrOptions };
  }

  return {
    write: writeOrOptions.write,
    ...(writeOrOptions.close !== undefined && { close: writeOrOptions.close }),
  };
}
