# Data Pipeline Guide

How to use `@ncbijs/pipeline`, `@ncbijs/store`, and `@ncbijs/sync` to build composable data pipelines that download, parse, and store NCBI bulk data locally.

## Overview

NCBI publishes bulk data files on their FTP servers — MeSH descriptors in XML, ClinVar variants in TSV, gene info in tab-delimited format, and more. The pipeline system lets you process these files with a single function call:

```
Source (HTTP, composite, or custom)
  → Parser (batch or streaming)
    → Sink (DuckDB, custom callback, or any)
```

All three steps are composable. Mix any source with any parser and any sink. The entire package is browser-compatible — every export uses only standard Web APIs (`fetch`, `DecompressionStream`, `TextDecoderStream`).

## Core concepts

### Source

A `Source<T>` produces an async stream of chunks when opened:

```typescript
interface Source<T> {
  readonly open: (signal: AbortSignal) => AsyncIterable<T>;
}
```

Built-in sources:

| Source                           | Import             | Use case                                                            |
| -------------------------------- | ------------------ | ------------------------------------------------------------------- |
| `createHttpSource(url)`          | `@ncbijs/pipeline` | Download from HTTP/HTTPS, auto-decompresses `.gz`                   |
| `createCompositeSource(sources)` | `@ncbijs/pipeline` | Multi-file parsers (e.g., taxonomy needs `names.dmp` + `nodes.dmp`) |

Need to read local files? Implement the `Source<string>` interface directly:

```typescript
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

### Parser

A parser transforms raw input into typed records. Two kinds exist:

**Batch parser** — receives the complete input as a single value, returns all records at once:

```typescript
type BatchParser<TRaw, TRecord> = (raw: TRaw) => ReadonlyArray<TRecord>;
```

All 21 existing bulk parsers (`parseMeshDescriptorXml`, `parseGeneInfoTsv`, `parseVariantSummaryTsv`, etc.) are batch parsers. They work unchanged with the pipeline.

**Stream parser** — receives an async stream of chunks, yields records incrementally:

```typescript
type StreamParser<TChunk, TRecord> = (input: AsyncIterable<TChunk>) => AsyncIterable<TRecord>;
```

Tag a streaming parser with `streamParser()` so the pipeline knows to use streaming mode:

```typescript
import { streamParser } from '@ncbijs/pipeline';
import { createPubmedXmlStream } from '@ncbijs/pubmed-xml';

const parser = streamParser(createPubmedXmlStream);
```

### Sink

A `Sink<T>` receives batches of records:

```typescript
interface Sink<T> {
  readonly write: (records: ReadonlyArray<T>) => Promise<void>;
  readonly close?: () => Promise<void>;
}
```

Built-in sinks:

| Sink                          | Import             | Use case                                         |
| ----------------------------- | ------------------ | ------------------------------------------------ |
| `createSink(fn)`              | `@ncbijs/pipeline` | Wrap any callback into a sink                    |
| `storage.createSink(dataset)` | `@ncbijs/store`    | Write directly to DuckDB via `DuckDbFileStorage` |

### Pipeline function

The `pipeline()` function wires source, parser, and sink together:

```typescript
import { pipeline } from '@ncbijs/pipeline';

const result = await pipeline(source, parser, sink, options?);
```

Returns a `PipelineResult`:

```typescript
interface PipelineResult {
  readonly recordsProcessed: number;
  readonly recordsFailed: number;
  readonly batchesWritten: number;
  readonly durationMs: number;
}
```

## Usage examples

### Download MeSH descriptors from HTTP into DuckDB

```typescript
import { pipeline, createHttpSource } from '@ncbijs/pipeline';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('ncbijs.duckdb');

const result = await pipeline(
  createHttpSource('https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml'),
  (xml) => parseMeshDescriptorXml(xml).descriptors,
  storage.createSink('mesh'),
);

console.log(`${result.recordsProcessed} descriptors in ${result.durationMs}ms`);
await storage.close();
```

### Load taxonomy from multiple HTTP sources

Taxonomy requires two files (`names.dmp` and `nodes.dmp`). Use `createCompositeSource` to download them concurrently:

```typescript
import { pipeline, createHttpSource, createCompositeSource } from '@ncbijs/pipeline';
import { parseTaxonomyDump } from '@ncbijs/datasets';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('ncbijs.duckdb');

await pipeline(
  createCompositeSource({
    namesDmp: createHttpSource('https://example.com/names.dmp'),
    nodesDmp: createHttpSource('https://example.com/nodes.dmp'),
  }),
  (composite) =>
    parseTaxonomyDump({
      namesDmp: composite.namesDmp,
      nodesDmp: composite.nodesDmp,
    }),
  storage.createSink('taxonomy'),
);

await storage.close();
```

### Stream PubMed XML into a custom sink

For large files that don't fit in memory, use a streaming parser:

```typescript
import { pipeline, createHttpSource, createSink, streamParser } from '@ncbijs/pipeline';
import { createPubmedXmlStream } from '@ncbijs/pubmed-xml';

await pipeline(
  createHttpSource('https://ftp.ncbi.nlm.nih.gov/pubmed/updatefiles/pubmed26n1500.xml.gz'),
  streamParser(createPubmedXmlStream),
  createSink(async (articles) => {
    console.log(`Batch of ${articles.length} articles`);
  }),
);
```

### Custom sink

Wrap any callback function into a sink:

```typescript
import { pipeline, createHttpSource, createSink } from '@ncbijs/pipeline';
import { parseGeneInfoTsv } from '@ncbijs/datasets';

await pipeline(
  createHttpSource('https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz'),
  parseGeneInfoTsv,
  createSink(async (genes) => {
    await fetch('https://my-api.com/genes', {
      method: 'POST',
      body: JSON.stringify(genes),
    });
  }),
);
```

### Download from HTTP with gzip

```typescript
import { createHttpSource } from '@ncbijs/pipeline';

const source = createHttpSource(
  'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz',
  { decompress: true },
);
```

## Pipeline options

### Batch size

Controls how many records are written to the sink per batch (default: 10,000):

```typescript
await pipeline(source, parser, sink, { batchSize: 5_000 });
```

### Progress reporting

Track progress during pipeline execution:

```typescript
await pipeline(source, parser, sink, {
  onProgress: (event) => {
    console.log(`${event.recordsProcessed} records, ${event.batchesWritten} batches`);
  },
});
```

The `ProgressEvent` includes:

```typescript
interface ProgressEvent {
  readonly phase: 'parse' | 'write';
  readonly recordsProcessed: number;
  readonly batchesWritten: number;
  readonly elapsedMs: number;
}
```

### Abort signal

Cancel a running pipeline:

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 30_000);

await pipeline(source, parser, sink, { signal: controller.signal });
```

The pipeline checks the signal before each batch write and throws `PipelineAbortError` when aborted.

### Error handling

Three strategies control what happens when a batch write fails:

```typescript
// Default: stop on first error
await pipeline(source, parser, sink, { onError: 'abort' });

// Skip failed batches and continue
await pipeline(source, parser, sink, { onError: 'skip' });

// Custom strategy with retry support
await pipeline(source, parser, sink, {
  onError: (error) => {
    if (error.retryCount < 3) {
      return 'retry';
    }
    return 'skip';
  },
});
```

The error callback receives a `PipelineError`:

```typescript
interface PipelineError<T> {
  readonly phase: 'source' | 'parse' | 'write';
  readonly cause: unknown;
  readonly record?: T;
  readonly batchIndex: number;
  readonly retryCount: number;
}
```

## Backpressure

The pipeline uses `AsyncIterable` + `for-await` for natural backpressure. In streaming mode, the internal `batchRecords()` generator pauses at `yield` until the sink finishes writing the previous batch. Memory is bounded to `batchSize` records at any time.

```
Source (yields chunks)
  → for-await pauses source when parser is full
    → batchRecords (buffers up to batchSize)
      → yield pauses when sink is writing
        → Sink.write()
```

## Storage integration

### ReadableStorage and WritableStorage

The `@ncbijs/store` package splits storage concerns into read and write interfaces:

```typescript
interface ReadableStorage {
  readonly getRecord: <T>(dataset: DatasetType, key: string) => Promise<T | undefined>;
  readonly searchRecords: <T>(
    dataset: DatasetType,
    query: SearchQuery,
  ) => Promise<ReadonlyArray<T>>;
  readonly getStats: () => Promise<ReadonlyArray<DatasetStats>>;
}

interface WritableStorage {
  readonly writeRecords: (dataset: DatasetType, records: ReadonlyArray<unknown>) => Promise<void>;
}

interface Storage extends ReadableStorage, WritableStorage {}
```

`DuckDbFileStorage` implements the full `Storage` interface. The `@ncbijs/store-mcp` package depends only on `ReadableStorage` — it never writes.

### DuckDbSink

`DuckDbFileStorage.createSink(dataset)` returns a `DuckDbSink` that is structurally compatible with the pipeline's `Sink` interface. No import dependency between `@ncbijs/store` and `@ncbijs/pipeline` — TypeScript's structural typing handles compatibility.

```typescript
const storage = await DuckDbFileStorage.open('ncbijs.duckdb');
const sink = storage.createSink('mesh');

await pipeline(createFileSource('desc2025.xml'), parseDescriptors, sink);

const record = await storage.getRecord('mesh', 'D000001');
```

### Supported datasets

| Dataset       | Type              | Primary key               | Source                                       |
| ------------- | ----------------- | ------------------------- | -------------------------------------------- |
| `mesh`        | MeSH descriptors  | Descriptor ID (`D000001`) | `desc20XX.xml`                               |
| `clinvar`     | Clinical variants | Variant UID               | `variant_summary.txt`                        |
| `genes`       | Gene records      | Gene ID                   | `gene_info.tsv`                              |
| `taxonomy`    | Taxonomy nodes    | Tax ID                    | `names.dmp` + `nodes.dmp`                    |
| `compounds`   | PubChem compounds | CID                       | `CID-SMILES` + `CID-InChI-Key` + `CID-IUPAC` |
| `id-mappings` | PMC ID mappings   | PMCID / PMID / DOI        | `PMC-ids.csv`                                |

## Sync scheduling

The `@ncbijs/sync` package watches NCBI data sources for updates and triggers callbacks when new data is available.

### Update checkers

An `UpdateChecker` compares the current sync state against the remote source:

```typescript
interface UpdateChecker {
  readonly dataset: string;
  readonly check: (currentState: DatasetSyncState) => Promise<UpdateCheckResult>;
}
```

The built-in `HttpTimestampChecker` uses HTTP `HEAD` requests to compare `Last-Modified` timestamps:

```typescript
import { HttpTimestampChecker } from '@ncbijs/sync';

const meshChecker = new HttpTimestampChecker(
  'mesh',
  'https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml',
);
```

### SyncScheduler

The scheduler runs update checks on a configurable interval and calls `onUpdate` when a dataset has new data:

```typescript
import { SyncScheduler, InMemorySyncState, HttpTimestampChecker } from '@ncbijs/sync';
import { pipeline, createFileSource } from '@ncbijs/pipeline';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('ncbijs.duckdb');
const syncState = new InMemorySyncState();

const checkers = [
  new HttpTimestampChecker('mesh', 'https://nlmpubs.nlm.nih.gov/.../desc2025.xml'),
  new HttpTimestampChecker('clinvar', 'https://ftp.ncbi.nlm.nih.gov/.../variant_summary.txt.gz'),
];

const scheduler = new SyncScheduler(syncState, checkers, {
  checkIntervalMs: 24 * 60 * 60 * 1000,
  datasets: ['mesh', 'clinvar'],
  onUpdate: async (dataset) => {
    await pipeline(
      createFileSource(`data/raw/${dataset}.xml`),
      parsers[dataset],
      storage.createSink(dataset),
    );
  },
  onError: (dataset, error) => {
    console.error(`Sync failed for ${dataset}: ${error.message}`);
  },
});

await scheduler.start();
```

### Sync state

The `SyncStateStore` interface tracks per-dataset sync progress:

```typescript
interface DatasetSyncState {
  readonly dataset: string;
  readonly lastSyncedAt: string | undefined;
  readonly lastSourceTimestamp: string | undefined;
  readonly lastChecksum: string | undefined;
  readonly recordCount: number;
  readonly status: 'idle' | 'checking' | 'syncing' | 'error';
  readonly lastError: string | undefined;
}
```

`InMemorySyncState` is provided for development and testing. For production, implement the `SyncStateStore` interface with persistent storage (e.g., a `sync_state` table in DuckDB).

## Full example

The `examples/data-pipeline/load.ts` script demonstrates the complete workflow — reading raw files, parsing them through the pipeline, and writing to DuckDB:

```bash
pnpm exec tsx examples/data-pipeline/load.ts --input-dir ./data/raw --db-path ./data/ncbijs.duckdb
```

It processes all available datasets in sequence, reports progress, and prints storage stats at the end.

## Architecture decisions

- **[ADR-0001: Pipeline Architecture](./adr/0001-pipeline-architecture.md)** — Why `AsyncIterable` over Node Streams or Web Streams
- **[ADR-0002: Offline to Data Pipelines](./adr/0002-offline-to-data-pipelines.md)** — Terminology rename rationale

## Related docs

- [Bulk Parser Catalog](./data-pipelines.md) — 21 bulk parsers and NCBI downloadable data inventory
- [Pipeline Architecture](./pipeline-architecture.md) — Storage strategy pattern, sync engine design, NCBI data inventory
- [RAG Integration](./rag-integration.md) — How pipelines feed into RAG workflows
