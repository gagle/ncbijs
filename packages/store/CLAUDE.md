---
package: '@ncbijs/store'
purpose: 'Storage interfaces (Storage / ReadableStorage / WritableStorage / FileStorage / CloudStorage) and a DuckDB-backed file-storage implementation for NCBI dataset records.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@duckdb/node-api'
used_by:
  - '@ncbijs/store-mcp'
  - 'apps/demo'
exports:
  - 'DuckDbFileStorage'
  - 'DuckDbSink'
  - 'DATASET_SCHEMAS'
  - 'DatasetSchema'
  - 'CloudStorage'
  - 'DatasetStats'
  - 'DatasetType'
  - 'FileStorage'
  - 'ReadableStorage'
  - 'SearchQuery'
  - 'Storage'
  - 'WritableStorage'
related_docs:
  - 'packages/store/README.md'
  - 'docs/data-pipelines.md'
last_audited: '2026-05-01'
---

# @ncbijs/store

## Purpose

Defines the storage abstraction used by the source-agnostic domain
packages (`mesh`, `clinvar`, `datasets`, `pubchem`, `id-converter`),
plus a concrete DuckDB-backed implementation that persists everything
to a single `.duckdb` file.

The interfaces (`ReadableStorage`, `WritableStorage`, `Storage`,
`FileStorage`, `CloudStorage`) are the contract surface — domain
packages define their own structurally-compatible interfaces and call
`Storage.fromStorage(myStorage)` without ever importing this package.
The DuckDB class is the reference implementation that satisfies all of
them.

**Node.js only.** The DuckDB binding is `@duckdb/node-api`. Browser
storage uses `@duckdb/duckdb-wasm` directly via a custom adapter
(see `apps/demo/src/duckdb-wasm-storage.ts`); that adapter is **not**
part of this package and is not exported from here.

## When to use

- Building an ETL job that loads NCBI archives into a local DuckDB
  database (combine with `@ncbijs/pipeline` and `@ncbijs/etl`).
- Querying a previously-loaded database with the same domain APIs
  used for live HTTP (`Mesh.fromStorage(storage).getDescriptor(id)`).
- Implementing a custom storage backend (Postgres, SQLite, S3, etc.)
  by satisfying the exported interfaces structurally.

## When NOT to use

| If you want to                                | Use instead                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| Query NCBI live over HTTP                     | The domain package directly (`new Mesh({ apiKey })` etc.)    |
| Stream a large archive into storage           | `@ncbijs/etl` (`load('mesh', storage.createSink('mesh'))`)   |
| Use DuckDB-Wasm in the browser                | `@duckdb/duckdb-wasm` directly + a custom adapter            |
| Schedule recurring re-syncs of storage        | `@ncbijs/sync` (`SyncScheduler`)                             |
| Expose storage over MCP                       | `@ncbijs/store-mcp`                                          |

## Exports

| Export                | Kind       | Purpose                                                                |
| --------------------- | ---------- | ---------------------------------------------------------------------- |
| `DuckDbFileStorage`   | class      | DuckDB-backed `FileStorage`. Static `open(path)` constructor.          |
| `DuckDbSink`          | class      | `Sink<object>` for `@ncbijs/pipeline` — batched writes inside a tx     |
| `DATASET_SCHEMAS`     | constant   | `Record<DatasetType, DatasetSchema>` with table SQL and (de)serializers |
| `DatasetSchema`       | interface  | Per-table contract: SQL, key transform, serialize, deserialize         |
| `Storage`             | interface  | Read + write contract (medium-agnostic)                                |
| `ReadableStorage`     | interface  | Read-only subset — accepted by `*.fromStorage(...)` consumers          |
| `WritableStorage`     | interface  | Write-only subset                                                      |
| `FileStorage`         | interface  | `Storage` + `path` + `close()`                                         |
| `CloudStorage`        | interface  | `Storage` + `connect()` + `disconnect()` (no concrete implementation yet) |
| `DatasetType`         | type       | `'mesh' \| 'clinvar' \| 'genes' \| 'taxonomy' \| 'compounds' \| 'id-mappings'` |
| `SearchQuery`         | interface  | `{ field, value, operator?, limit? }` for `searchRecords`              |
| `DatasetStats`        | interface  | `{ dataset, recordCount, sizeBytes, lastUpdated? }`                    |

## API surface

### `DuckDbFileStorage.open(dbPath): Promise<DuckDbFileStorage>`

Opens or creates a DuckDB file. Pass `':memory:'` for an in-memory
database (handy in tests). Initializes all six dataset tables and
their indexes idempotently.

```ts
const storage = await DuckDbFileStorage.open('data/ncbijs.duckdb');
```

### `writeRecords(dataset, records): Promise<void>`

Inserts an array of records into the dataset's table inside a single
transaction. Each record is serialized via the dataset's
`DatasetSchema.serialize` before parameter binding. Existing rows
with the same primary key are replaced (`INSERT OR REPLACE`).

A no-op for empty arrays.

### `getRecord<T>(dataset, key): Promise<T | undefined>`

Looks up a single record by primary key (string for VARCHAR-keyed
tables, parsed as integer for INTEGER-keyed tables). Returns
`undefined` if the key cannot be parsed or the row does not exist.

### `searchRecords<T>(dataset, query): Promise<ReadonlyArray<T>>`

Queries by a single field with one of three operators: `eq` (default),
`contains` (`LIKE %value%`), `starts_with` (`LIKE value%`). The
`field` is converted from camelCase to snake_case and validated
against `^[a-z_][a-z0-9_]*$` to prevent SQL injection. Pass `limit`
to bound the result set.

### `getStats(): Promise<ReadonlyArray<DatasetStats>>`

Row counts for every dataset table. `sizeBytes` is currently always
`0` (DuckDB does not expose per-table size cheaply); consumers
should not rely on it.

### `createSink(dataset): DuckDbSink`

Returns a sink suitable for `@ncbijs/pipeline`. Structurally compatible
with `Sink<T>` for any object-shaped `T`. Each `write(records)` runs
inside a transaction with rollback on error.

```ts
import { pipeline, createHttpSource } from '@ncbijs/pipeline';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';

await pipeline(
  createHttpSource('https://nlmpubs.nlm.nih.gov/.../desc2026.xml'),
  parseMeshDescriptorXml,
  storage.createSink('mesh'),
);
```

### `close(): Promise<void>`

Closes the DuckDB connection (synchronous internally via
`closeSync()`, exposed as `Promise<void>` for interface symmetry).

## Cross-package wiring

- **Domain packages query storage via structural typing.** Each
  source-agnostic package (`@ncbijs/mesh`, `@ncbijs/clinvar`,
  `@ncbijs/datasets`, `@ncbijs/pubchem`, `@ncbijs/id-converter`)
  declares its own minimal `DataStorage` interface in its own
  `interfaces/` folder. `ReadableStorage` from this package
  satisfies all of them — no cross-package import required. This
  keeps domain packages browser-safe even though `@ncbijs/store`
  itself is Node-only.
- **`@ncbijs/etl`** uses `DuckDbFileStorage.createSink(dataset)` as
  the default sink for every loader.
- **`@ncbijs/store-mcp`** exposes `DuckDbFileStorage` over MCP for
  Claude Desktop / Claude Code.
- **`apps/demo`** depends on this package for type imports
  (`ReadableStorage`, `DatasetType`) but uses `@duckdb/duckdb-wasm`
  with a hand-rolled adapter (`apps/demo/src/duckdb-wasm-storage.ts`)
  for the browser side. The adapter satisfies `ReadableStorage`
  structurally; nothing from this package's runtime is shipped to
  the browser bundle.

## Common pitfalls

1. **Importing this package in browser code.** `@duckdb/node-api` is
   a native Node binding. Bundlers will fail or, worse, ship Node-only
   modules. For browser DuckDB use `@duckdb/duckdb-wasm` and write
   your own adapter against the exported `ReadableStorage` interface
   — that is exactly what `apps/demo` does. Type-only imports
   (`import type { ReadableStorage }`) are safe everywhere.

2. **Adding a new dataset.** Three coordinated edits:
   (a) extend the `DatasetType` union in
   `interfaces/storage.interface.ts`,
   (b) add a `DatasetSchema` entry to `DATASET_SCHEMAS` in
   `dataset-schema.ts` (table SQL, indexes, insert SQL, get-by-key
   SQL, key transform, serialize, deserialize),
   (c) extend `ALL_DATASET_TYPES` in `duckdb-file-storage.ts` so
   `_initializeSchema` and `getStats` enumerate it. Missing any of
   these silently breaks the new dataset.

3. **Calling `searchRecords` with a non-existent column.** The
   camelCase → snake_case mapping is naive (regex-based). If the
   field name does not match a real column, DuckDB will throw on
   query execution. There is no compile-time check — TypeScript sees
   `field: string`. Match the column names exactly as defined in
   `dataset-schema.ts`.

4. **Mutating a record after `writeRecords`.** Records are serialized
   eagerly inside the transaction. Subsequent mutation of the input
   array does not affect the DB, but also does not produce any error
   — make this an explicit copy if the caller continues to mutate.

5. **`sizeBytes: 0` in stats.** `DatasetStats.sizeBytes` is reported
   as `0` for every dataset because DuckDB does not expose per-table
   size without a full scan. Do not use it for capacity planning.
   File-level size is available via `fs.stat(path)` on the DuckDB
   file path.

6. **Long-lived connection.** `DuckDbFileStorage` holds one DuckDB
   connection for its lifetime. Long-running processes that hold
   the file across system restarts/upgrades may need to `close()`
   and re-`open()` periodically; otherwise DuckDB's WAL grows
   unbounded under sustained writes. The ETL pipelines call `close()`
   at the end of every run.

7. **`CloudStorage` has no implementation here.** The interface
   exists so future cloud-backed adapters slot in cleanly, but this
   package only ships `DuckDbFileStorage`. Don't rely on
   `CloudStorage` being importable as a class — it isn't.

## Testing

```bash
pnpm nx run @ncbijs/store:test
pnpm nx run @ncbijs/store:typecheck
pnpm nx run @ncbijs/store:lint
pnpm nx run @ncbijs/store:build
```

Unit tests use `':memory:'` DuckDB instances, exercise every dataset's
schema (round-trip serialize / deserialize, every search operator,
empty-array writes, key-not-found, transaction rollback on schema
violation), and assert that `createSink` is structurally compatible
with `@ncbijs/pipeline`'s `Sink<T>`.

## Files

```
packages/store/src/
  index.ts                                  # public re-exports
  duckdb-file-storage.ts                    # DuckDbFileStorage
  duckdb-file-storage.spec.ts
  duckdb-sink.ts                            # DuckDbSink
  duckdb-sink.spec.ts
  dataset-schema.ts                         # DATASET_SCHEMAS + DatasetSchema
  dataset-schema.spec.ts
  interfaces/
    storage.interface.ts                    # all storage contracts + DatasetType
```
