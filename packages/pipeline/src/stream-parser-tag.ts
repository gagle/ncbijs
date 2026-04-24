import type { StreamParser } from './interfaces/pipeline.interface';
import { streamTag } from './interfaces/pipeline.interface';

/** Mark a function as a streaming parser for pipeline dispatch. */
export function streamParser<TIn, TOut>(
  fn: (input: AsyncIterable<TIn>) => AsyncIterable<TOut>,
): StreamParser<TIn, TOut> {
  return Object.assign(fn, { [streamTag]: true as const });
}

/** Check whether a parser function is tagged as a streaming parser. */
export function isStreamParser<TIn, TOut>(
  fn: ((raw: TIn) => ReadonlyArray<TOut>) | StreamParser<TIn, TOut>,
): fn is StreamParser<TIn, TOut> {
  return streamTag in fn;
}
