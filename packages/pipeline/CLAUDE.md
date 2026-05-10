---
package: '@ncbijs/pipeline'
purpose: 'Composable streaming ETL primitive — Source → Parse → Sink. Zero dependencies, project-agnostic, the foundation for @ncbijs/etl and @ncbijs/sync.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/etl'
exports:
  - 'pipeline'
  - 'batchRecords'
  - 'streamParser'
  - 'isStreamParser'
  - 'streamTag'
  - 'PipelineAbortError'
  - 'createHttpSource'
  - 'createCompositeSource'
  - 'createSink'
  - 'BatchParser'
  - 'StreamParser'
  - 'PipelineOptions'
  - 'PipelineResult'
  - 'PipelineError'
  - 'ProgressEvent'
  - 'ErrorStrategy'
  - 'Source'
  - 'Sink'
  - 'HttpSourceOptions'
  - 'CreateSinkOptions'
related_docs:
  - 'docs/pipeline-architecture.md'
  - 'docs/data-pipelines.md'
last_audited: '2026-04-08'
---

# @ncbijs/pipeline

## Purpose

A tiny, project-agnostic streaming ETL primitive. Compose a `Source`
(where bytes come from), a `BatchParser` or `StreamParser` (how to
turn bytes into records), and a `Sink` (where records go), and call
`pipeline()` to run them with bounded memory, batching, retries,
abort propagation, and progress events.

Zero runtime dependencies. **No NCBI-specific code.** Designed to be
extractable into a standalone published library — same disciplined
boundary as `@ncbijs/rate-limiter`.

**Browser-compatible.** Every export uses only standard Web APIs
(`fetch`, `DecompressionStream`, `TextDecoderStream`,
`AsyncIterable`) — no Node built-ins. Runs unchanged in workers and
modern browsers.

## When to use

- Loading a multi-GB NCBI archive (PubMed baseline, PMC OA, ClinVar
  variation release, MeSH desc<year>.xml) into bounded memory.
- Authoring a new ETL pipeline for an NCBI dataset (compose with
  `createHttpSource` + a domain-package bulk parser + your sink).
- Anywhere you have an `AsyncIterable` of bytes/strings and want
  retry-aware batched writes.

## When NOT to use

| Goal                                    | Use instead                                                      |
| --------------------------------------- | ---------------------------------------------------------------- |
| Use a pre-wired NCBI dataset loader     | `@ncbijs/etl` (`load('mesh', sink)`)                             |
| Single HTTP request, parse once         | Just `fetch` + the domain package's parser                       |
| Watch upstream for updates              | `@ncbijs/sync` (composes `@ncbijs/pipeline` for the re-load)     |
| Persistent local storage                | `@ncbijs/store` (DuckDB)                                         |

## Exports

| Export                       | Kind       | Purpose                                                            |
| ---------------------------- | ---------- | ------------------------------------------------------------------ |
| `pipeline`                   | function   | Main entry; runs source → parse → sink                             |
| `createHttpSource`           | factory    | HTTP `Source<string>` with auto `.gz` decompression                |
| `createCompositeSource`      | factory    | Concatenate multiple sources sequentially                          |
| `createSink`                 | factory    | Wrap a callback or options object as a `Sink`                      |
| `streamParser`               | function   | Tag a stream-parser generator for runtime dispatch                 |
| `isStreamParser`             | type guard | True if a parser was tagged with `streamParser()`                  |
| `streamTag`                  | symbol     | Internal symbol for tagging                                        |
| `batchRecords`               | function   | Standalone async generator that batches an `AsyncIterable<T>`      |
| `PipelineAbortError`         | class      | Thrown on abort or unhandled phase error; wraps the cause          |
| `Source<T>`, `Sink<T>`       | interfaces | Minimal contracts                                                  |
| `BatchParser`, `StreamParser`| types      | Two parser shapes (synchronous batch vs async generator)           |
| `PipelineOptions`            | interface  | `{ batchSize, signal, onError, onProgress }`                       |
| `PipelineResult`             | interface  | `{ recordsProcessed, recordsFailed, batchesWritten, durationMs }`  |
| `PipelineError`              | interface  | Passed to `onError` callback                                       |
| `ProgressEvent`              | interface  | Passed to `onProgress` callback                                    |
| `ErrorStrategy<T>`           | type       | `'abort' \| 'skip' \| (err) => 'retry' \| 'skip' \| 'abort'`       |

## API surface

### `pipeline(source, parse, sink, options?)`

```ts
function pipeline<TRaw, TRecord>(
  source: Source<TRaw>,
  parse: BatchParser<TRaw, TRecord> | StreamParser<TRaw, TRecord>,
  sink: Sink<TRecord>,
  options?: PipelineOptions<TRecord>,
): Promise<PipelineResult>;
```

The runtime tag-dispatches `parse`: if `isStreamParser(parse)` is
true, it consumes `source.open(signal)` as an `AsyncIterable<TRaw>`
and yields records incrementally. Otherwise it accumulates the source
into memory, calls `parse(raw)`, and batches the result.

### Sources

- **`createHttpSource(url, opts?)`** — auto-decompresses `.gz` (toggle
  with `decompress: false`). Yields `string` chunks.
- **`createCompositeSource(sources)`** — concatenates sources in
  order. Useful for sharded distributions (PubMed baseline arrives in
  ~36 separate gz files).
- **Local files / custom sources** — implement `Source<T>` directly.
  No built-in file source ships (keeps the package
  browser-compatible). Wrap `node:fs/promises` yourself when running
  on Node:

  ```ts
  import { readFile } from 'node:fs/promises';
  import type { Source } from '@ncbijs/pipeline';

  function createFileSource(path: string): Source<string> {
    return {
      async *open(_signal: AbortSignal): AsyncIterable<string> {
        yield await readFile(path, 'utf-8');
      },
    };
  }
  ```

### Parsers

- **`BatchParser<TRaw, TRecord>`** — synchronous `(raw) => records[]`.
  Use when input fits in memory.
- **`StreamParser<TChunk, TRecord>`** — async generator
  `(chunks) => AsyncIterable<TRecord>`. Use for bounded memory. **Must
  be wrapped with `streamParser(...)` to be tag-dispatched correctly.**

### `createSink(write | options)`

Wrap a callback or `{ write, close? }` object as a `Sink`. The
optional `close` runs in a `finally` block at the end of the run.

### `batchRecords(iterable, batchSize)`

Standalone batching helper for arbitrary `AsyncIterable<T>`. Doesn't
require `pipeline()`.

### Options + backpressure

`PipelineOptions.batchSize` defaults to **10,000** records per write.
Memory is bounded to that — the internal `batchRecords` generator
pauses at `yield` until `sink.write()` resolves, which propagates
backpressure all the way up the chain:

```
Source (yields chunks)
  → for-await pauses source while parser is busy
    → batchRecords (buffers up to batchSize)
      → yield pauses while sink is writing
        → Sink.write()
```

`onProgress(event: ProgressEvent)` fires after each batch with
`{ phase: 'parse' | 'write', recordsProcessed, batchesWritten,
elapsedMs }`. Use it for logging or rate metrics; it never blocks the
pipeline.

## Error handling

Three strategies, set via `options.onError`:

- **`'abort'`** (default) — re-throw as `PipelineAbortError`. Sink's
  `close()` still runs.
- **`'skip'`** — swallow, continue. Failed records counted in
  `result.recordsFailed`.
- **callback** `(error: PipelineError<T>) => 'retry' | 'skip' | 'abort'`
  — fine-grained. Receives `{ phase, cause, record?, batchIndex,
  retryCount }`. Used for write retries (max 3 attempts).

## Cross-package wiring

- **Used by `@ncbijs/etl`** for every dataset loader. Each
  `etl/load('<dataset>', sink)` composes `createHttpSource` + the
  appropriate domain-package bulk parser + the user's sink.
- **Used by `@ncbijs/sync`** to re-run pipelines on detected upstream
  change.
- **Composes with `@ncbijs/store`** — `ReadableStorage.createSink(<dataset>)`
  produces a DuckDB-backed `Sink<T>` wired for typed inserts.
- **Composes with bulk parsers from any domain package**:
  `parseMeshDescriptorXml` (mesh), `parseClinVarVcv` (clinvar),
  `parsePubChemSubstanceJson` (pubchem), etc.

## Common pitfalls

1. **Forgetting to wrap a stream parser with `streamParser(...)`.** If
   the parser is not tagged, the runtime falls through to
   `runBatchPipeline`, which calls `parse(rawAccumulated)` —
   blowing up memory on large inputs. The tag is the dispatch key.

2. **Sources that produce nothing.** `collectSource` (batch path)
   throws `PipelineAbortError('source', 'Source produced no data')`
   if the source closes without yielding. Authors of new sources
   should ensure they yield at least once or signal an HTTP error
   explicitly.

3. **Sinks that don't return on partial writes.** `sink.write` is
   awaited per batch with up to 3 retries. A sink that "writes" 9 of
   10 records and resolves without error will report success. Sinks
   should reject (throw) on partial writes — the retry path treats
   thrown errors via `onError`.

4. **AbortSignal not respected by long parsers.** `pipeline()` checks
   `signal.aborted` between batches but **not inside the parser**. A
   long synchronous batch parse will not yield to the abort. For
   long-running parses, prefer `streamParser` so abort is checked
   between yields.

5. **Sharing a single `controller.signal` across multiple pipelines.**
   Aborting cancels every pipeline using that signal. Usually fine,
   sometimes surprising — give each pipeline its own
   `AbortController` if you want independent cancellation.

6. **Adding NCBI-specific code here.** This package is intentionally
   project-agnostic. Domain logic (URL templates, schema knowledge,
   credentials) belongs in the consuming package's `*-client.ts` or
   bulk-parsers. Treat this rule as load-bearing.

## Testing

```bash
pnpm nx run @ncbijs/pipeline:test
pnpm nx run ncbijs-e2e:e2e -- pipeline
```

Unit tests cover all sources, sinks, and both batch + stream paths.
E2E tests run against real NCBI URLs.

## Files

```
packages/pipeline/src/
  index.ts                                # public re-exports
  pipeline.ts                             # pipeline() + run helpers
  batch-records.ts                        # batchRecords()
  stream-parser-tag.ts                    # streamParser() / isStreamParser
  errors/pipeline-abort-error.ts          # PipelineAbortError
  sources/
    http-source.ts                        # createHttpSource
    composite-source.ts                   # createCompositeSource
  sinks/
    create-sink.ts                        # createSink
  interfaces/
    pipeline.interface.ts                 # all public types + streamTag
```
