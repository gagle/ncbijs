<h1 align="center">@ncbijs/pipeline</h1>

> **Runtime**: Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/pipeline"><img src="https://img.shields.io/npm/v/@ncbijs/pipeline" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/pipeline"><img src="https://img.shields.io/npm/dm/@ncbijs/pipeline" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/pipeline" alt="license" /></a>
</p>

<p align="center">
  Composable streaming ETL building block — Source &rarr; Parse &rarr; Sink. Zero dependencies.
</p>

---

## Why

NCBI bulk distributions ship as multi-gigabyte FTP archives that don't fit in memory: PubMed baseline (~38 GB compressed), PMC OA full text, ClinVar variant releases, MeSH descriptors. Loading them naively crashes the process.

`@ncbijs/pipeline` is a tiny, project-agnostic streaming primitive: you compose a `Source` (where bytes come from), a parser (how to turn bytes into records), and a `Sink` (where records go), and it runs them with bounded memory, batching, retries, abort propagation, and progress events.

It is the foundation `@ncbijs/etl` and `@ncbijs/sync` build on — but it is fully reusable on its own. There is nothing NCBI-specific inside.

## Install

```bash
npm install @ncbijs/pipeline
```

## Quick start

```typescript
import {
  pipeline,
  createHttpSource,
  createSink,
  streamParser,
} from '@ncbijs/pipeline';

// 1. Source: stream bytes from anywhere (HTTP, file, S3, ...)
const source = createHttpSource('https://example.org/data.json.gz', {
  decompress: true, // auto-decompresses .gz
});

// 2. Parser: turn raw chunks into typed records
//    Use `streamParser(...)` for incremental parsing with bounded memory.
const parse = streamParser<string, MyRecord>(async function* (chunks) {
  let buffer = '';
  for await (const chunk of chunks) {
    buffer += chunk;
    // ... emit records as they become parseable
    yield record;
  }
});

// 3. Sink: write records anywhere (DB, file, queue, ...)
const sink = createSink<MyRecord>(async (batch) => {
  await db.insertMany(batch);
});

// 4. Run
const result = await pipeline(source, parse, sink, {
  batchSize: 5_000,
  onProgress: (event) => {
    console.log(`${event.recordsProcessed} records, ${event.elapsedMs}ms`);
  },
});

console.log(`Done: ${result.recordsProcessed} records in ${result.durationMs}ms`);
```

## API

### `pipeline(source, parse, sink, options?)`

Run a complete pipeline. Resolves with a `PipelineResult` summary.

```typescript
function pipeline<TRaw, TRecord>(
  source: Source<TRaw>,
  parse: BatchParser<TRaw, TRecord> | StreamParser<TRaw, TRecord>,
  sink: Sink<TRecord>,
  options?: PipelineOptions<TRecord>,
): Promise<PipelineResult>;
```

| Option       | Type                            | Default          | Description                                       |
| ------------ | ------------------------------- | ---------------- | ------------------------------------------------- |
| `batchSize`  | `number`                        | `10_000`         | Records per `sink.write` call                     |
| `signal`     | `AbortSignal`                   | new controller   | Cancellation propagated to source, parser, sink   |
| `onError`    | `'abort' \| 'skip' \| callback` | `'abort'`        | What to do when a phase throws (see below)        |
| `onProgress` | `(event) => void`               | —                | Fired after each batch write                      |

The runtime auto-detects whether `parse` is a `BatchParser` or `StreamParser` (via `streamTag`), and dispatches accordingly.

### Sources

#### `createHttpSource(url, options?)`

Stream from a URL. Auto-decompresses `.gz` responses unless `decompress: false`.

```typescript
const source = createHttpSource('https://ftp.ncbi.nlm.nih.gov/...gz', {
  headers: { 'User-Agent': 'my-tool/1.0' },
  decompress: true, // default: true if URL ends with .gz
});
```

#### `createCompositeSource(sources)`

Compose several sources into one. Yields chunks from each in sequence — useful for sharded distributions (e.g. PubMed baseline files).

```typescript
const source = createCompositeSource([
  createHttpSource(url1),
  createHttpSource(url2),
  createHttpSource(url3),
]);
```

### Parsers

Two parser shapes:

- **`BatchParser<TRaw, TRecord>`** — a synchronous `(raw) => records[]`. Use when the input fits in memory.
- **`StreamParser<TChunk, TRecord>`** — an async generator `(chunks) => AsyncIterable<record>`. Use for bounded memory.

Wrap a stream parser with `streamParser(...)` so the runtime can tag-dispatch:

```typescript
const parse = streamParser<string, Article>(async function* (chunks) {
  for await (const chunk of chunks) {
    // ... yield records incrementally
  }
});
```

### Sinks

#### `createSink(write)` or `createSink({ write, close? })`

Wrap a callback or options object as a `Sink`. The optional `close` runs in a `finally` block at the end of the pipeline.

```typescript
const sink = createSink<MyRecord>({
  write: async (batch) => { await db.insertMany(batch); },
  close: async () => { await db.close(); },
});
```

### Utilities

#### `batchRecords(records, batchSize)`

Standalone async generator that groups any `AsyncIterable<T>` into `ReadonlyArray<T>` batches. Useful outside of `pipeline()`.

#### `streamTag` and `isStreamParser`

Symbol + type guard for advanced users who want to author their own stream-parser wrappers.

## Error handling

`onError` controls what happens when source, parse, or write throws. Three forms:

- `'abort'` (default) — re-throw as `PipelineAbortError`, sink.close still runs.
- `'skip'` — swallow the error, continue. Failed records counted in `result.recordsFailed`.
- A callback `(error) => 'retry' | 'skip' | 'abort'` — fine-grained control. Receives `{ phase, cause, record?, batchIndex, retryCount }`.

Writes are retried up to 3 times with the callback consulted between attempts.

```typescript
await pipeline(source, parse, sink, {
  onError: (error) => {
    if (error.phase === 'write' && error.retryCount < 3) return 'retry';
    if (error.cause instanceof TransientError) return 'skip';
    return 'abort';
  },
});
```

## Cancellation

Pass an `AbortSignal` via `options.signal` to cancel mid-run. The signal propagates to the source's `open(signal)` and is checked before each batch.

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30_000);

await pipeline(source, parse, sink, { signal: controller.signal });
```

## Zero dependencies

`@ncbijs/pipeline` has no runtime dependencies and contains no NCBI-specific code. It is intentionally project-agnostic and could be extracted to a standalone published library with no changes — the same way `@ncbijs/rate-limiter` is structured.

## See also

- [`CLAUDE.md`](./CLAUDE.md) — agent reference (deep API, cross-package wiring, common pitfalls)
- [Architecture overview](../../docs/architecture.md)
