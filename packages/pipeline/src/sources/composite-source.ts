import type { Source } from '../interfaces/pipeline.interface';

type SourceMap = Record<string, Source<string>>;

type CompositeResult<T extends SourceMap> = {
  readonly [K in keyof T]: string;
};

/** Combine multiple sources into a single composite source for multi-file parsers. */
export function createCompositeSource<T extends SourceMap>(sources: T): Source<CompositeResult<T>> {
  return {
    async *open(signal: AbortSignal): AsyncIterable<CompositeResult<T>> {
      const entries = Object.entries(sources);

      const results = await Promise.all(
        entries.map(async ([key, source]) => {
          let accumulated = '';

          for await (const chunk of source.open(signal)) {
            accumulated += chunk;
          }

          return [key, accumulated] as const;
        }),
      );

      yield Object.fromEntries(results) as CompositeResult<T>;
    },
  };
}
