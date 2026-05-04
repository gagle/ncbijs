# ADR 0001: AsyncIterable-Based Pipeline Architecture

## Status

Accepted

## Context

The ncbijs monorepo has 21 bulk parsers across 13 packages that transform NCBI data files into typed records. Users need to wire these parsers into pipelines: download bulk data, parse it, and store the results in DuckDB or another backend. The `examples/data-pipeline/load.ts` script does this manually with `readFileSync`, parser calls, and batched writes — but the pattern is repetitive and lacks error handling, backpressure, or abort support.

We needed a `@ncbijs/pipeline` package to provide composable `Source → Parse → Sink` abstractions. The key design question: which streaming primitive should the pipeline use?

## Alternatives Considered

### 1. Node.js Streams (Readable/Transform/Writable)

Node.js streams are the traditional choice for backpressure-aware data processing in Node. However:

- **Complex API surface**: `pipe()`, `pipeline()`, `highWaterMark`, `_read()`, `_write()`, `_transform()`, `_flush()` — significant learning curve.
- **Error handling is fragile**: Errors in piped streams can leave resources open. The `stream.pipeline()` utility helps but adds ceremony.
- **Object mode quirks**: Streams default to Buffer/string mode. Object mode disables backpressure (`highWaterMark` counts objects, not bytes), reducing one of their primary advantages.
- **Not portable**: Node streams don't exist in Deno, Bun (partial), or browsers.

### 2. Web Streams (ReadableStream/WritableStream/TransformStream)

Web Streams are standards-track and cross-runtime. However:

- **Reader/writer ceremony**: Consuming a `ReadableStream` requires `getReader()` + `read()` loops with manual `releaseLock()`.
- **Error propagation**: Errors in transforms don't automatically propagate upstream.
- **Node.js integration**: Requires `Readable.fromWeb()` / `Readable.toWeb()` adapters when interacting with `fs` or `zlib`.
- **Still evolving**: `TransformStream` backpressure semantics have subtle cross-runtime differences.

### 3. AsyncIterable (chosen)

`AsyncIterable<T>` is the language-level primitive for async sequences:

- **Built into the language**: `for await...of` is native syntax. No library needed.
- **Natural backpressure**: Generator functions suspend at `yield` until the consumer calls `next()`. Memory is bounded by batch size.
- **Cross-runtime**: Works identically in Node, Deno, Bun, and browsers.
- **Already used in ncbijs**: 5 packages already expose `AsyncIterable` or `AsyncIterableIterator` — `pubmed-xml` (`createPubmedXmlStream`), `jats`, `pubtator`, `eutils`, `pubmed`.
- **Interoperable**: Node.js `ReadableStream` implements `Symbol.asyncIterator` in Node 20+. `fs.createReadStream()` also implements it.
- **Minimal API**: `Source<T>` = `{ open(signal) => AsyncIterable<T> }`. `Sink<T>` = `{ write(records) => Promise<void> }`. Two interfaces, not six stream classes.

## Decision

Use `AsyncIterable<T>` as the core streaming primitive for `@ncbijs/pipeline`.

### Design details

- **`Source<T>`**: `{ open(signal: AbortSignal) => AsyncIterable<T> }` — produces chunks.
- **`Sink<T>`**: `{ write(records: ReadonlyArray<T>) => Promise<void>; close?() => Promise<void> }` — receives batches.
- **`BatchParser<TRaw, TRecord>`**: `(raw: TRaw) => ReadonlyArray<TRecord>` — synchronous, receives complete input.
- **`StreamParser<TChunk, TRecord>`**: `(input: AsyncIterable<TChunk>) => AsyncIterable<TRecord>` — tagged with `Symbol('streamParser')` for runtime dispatch.
- **`pipeline(source, parser, sink, options?)`**: Single entry point. Detects batch vs stream parser via symbol tag. Handles batching, error strategies (abort/skip/retry), progress reporting, and abort signals.
- **Backpressure**: `batchRecords()` async generator buffers up to `batchSize` records (default 10,000), then `yield`s the batch. The `yield` suspends until the consumer (sink write loop) pulls the next batch. Memory is bounded.

### Batch vs Stream dispatch

Existing parsers (21 of them) are batch functions: `(string) => Array<T>`. One streaming parser exists: `createPubmedXmlStream`. Rather than forcing all parsers to adopt a streaming interface, the pipeline detects the parser type at runtime:

- **Batch**: Pipeline collects all source chunks into a single string, calls the parser, slices the result into batches.
- **Stream**: Pipeline passes `source.open(signal)` directly to the parser, then batches the output.

The `streamParser()` tag function attaches a `Symbol` to distinguish them. This is backwards-compatible — existing parser functions work unchanged.

## Consequences

- **Zero runtime dependencies**: `@ncbijs/pipeline` has no external dependencies. Sources use `node:fs` and `fetch()`.
- **Existing parsers unchanged**: All 21 bulk parsers work as-is. Only `createPubmedXmlStream` was adapted (from `ReadableStream<string>` to `AsyncIterable<string>` — a 10-line change).
- **DuckDB sink lives in `@ncbijs/store`**: `DuckDbSink` implements the `Sink` interface structurally (duck typing). `@ncbijs/pipeline` has no dependency on `@ncbijs/store`.
- **Future parsers can be either batch or stream**: No migration pressure. Choose based on data size.
