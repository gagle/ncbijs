---
package: '@ncbijs/etl'
purpose: 'Pre-wired NCBI dataset loaders. One function call to download, parse, and sink a known dataset (mesh, clinvar, genes, taxonomy, compounds, id-mappings). Composes @ncbijs/pipeline + @ncbijs/sync + domain bulk parsers.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/pipeline'
  - '@ncbijs/sync'
  - '@ncbijs/mesh'
  - '@ncbijs/clinvar'
  - '@ncbijs/datasets'
  - '@ncbijs/pubchem'
  - '@ncbijs/id-converter'
used_by: []
exports:
  - 'load'
  - 'loadAll'
  - 'createCheckers'
  - 'listDatasets'
  - 'getDataset'
  - 'EtlDatasetType'
  - 'DatasetInfo'
  - 'DatasetLoadResult'
  - 'LoadOptions'
  - 'LoadAllOptions'
  - 'LoadAllResult'
  - 'SinkFactory'
related_docs:
  - 'docs/data-pipelines.md'
  - 'docs/pipeline-architecture.md'
last_audited: '2026-03-09'
---

# @ncbijs/etl

## Purpose

Pre-wired loaders for the NCBI bulk datasets the rest of the ecosystem
cares about. The user supplies a `Sink<object>` and an
`EtlDatasetType`; the package handles the URL, decompression, parser,
and pipeline wiring.

Internally it is a thin orchestration layer: a frozen `REGISTRY` of
six `DatasetDescriptor` records, each carrying a `createSource` and a
`parse` function imported from the relevant domain package. `load()`
runs `pipeline()` over those. `createCheckers()` produces matching
`UpdateChecker` instances for `@ncbijs/sync`.

This package owns NO parsing logic of its own — it is a registry that
wires existing primitives together.

## When to use

- Bulk-loading any of the six registered datasets (mesh, clinvar,
  genes, taxonomy, compounds, id-mappings) into a `Sink<object>` —
  typically a DuckDB sink from `@ncbijs/store`.
- Loading several datasets in one call with `loadAll()` and a sink
  factory.
- Building a sync workflow: combine `createCheckers()` with
  `@ncbijs/sync`'s `SyncScheduler` so re-loads happen only when
  upstream content changes (MD5 or `Last-Modified`).

## When NOT to use

| Goal                                                       | Use instead                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Loading a dataset NOT in the registry                      | `@ncbijs/pipeline` directly — compose `createHttpSource` + a domain bulk parser |
| Querying data already loaded into DuckDB                   | The same domain package via `fromStorage(storage)` — see `@ncbijs/store`        |
| Live HTTP queries against NCBI APIs                        | The relevant domain package's HTTP class (e.g., `new ClinVar({ apiKey })`)      |
| Polling or scheduling without re-running a pipeline        | `@ncbijs/sync` directly with your own `onUpdate`                                |
| Plain `Sink`/`Source` plumbing (no NCBI knowledge)         | `@ncbijs/pipeline`                                                              |
| MCP tool exposure of loaded data                           | `@ncbijs/store-mcp`                                                             |

## Exports

| Export                | Kind       | Purpose                                                            |
| --------------------- | ---------- | ------------------------------------------------------------------ |
| `load`                | function   | Run a single dataset's pipeline into the given sink                |
| `loadAll`             | function   | Run multiple (or all) datasets sequentially                        |
| `createCheckers`      | function   | Build `UpdateChecker[]` for `@ncbijs/sync`'s `SyncScheduler`       |
| `listDatasets`        | function   | Enumerate all registered datasets with metadata                    |
| `getDataset`          | function   | Look up one dataset's `DatasetInfo` by id                          |
| `EtlDatasetType`      | type       | String union of the six registered dataset ids                     |
| `DatasetInfo`         | interface  | URL list, format, size estimate, update frequency                  |
| `LoadOptions`         | interface  | `{ transform?, signal?, batchSize?, onProgress? }`                 |
| `LoadAllOptions`      | interface  | `{ datasets?, signal?, batchSize?, onDatasetComplete?, onError? }` |
| `LoadAllResult`       | interface  | `{ results, totalDurationMs }`                                     |
| `DatasetLoadResult`   | interface  | Per-dataset `{ dataset, result?, error? }`                         |
| `SinkFactory`         | type       | `(dataset: EtlDatasetType) => Sink<object>`                        |

## API surface

### `load(dataset, sink, options?)`

```ts
function load(
  dataset: EtlDatasetType,
  sink: Sink<object>,
  options?: LoadOptions,
): Promise<PipelineResult>;
```

Looks up the descriptor, calls `descriptor.createSource()`, optionally
wraps `descriptor.parse` with the user's `transform`, and runs
`pipeline()` end-to-end. Returns the `PipelineResult` from
`@ncbijs/pipeline`.

The `transform` runs **after** the package's own parser and receives
the parsed records — use it to filter or remap, not to reparse the raw
bytes.

### `loadAll(sinkFactory, options?)`

```ts
function loadAll(
  sinkFactory: SinkFactory,
  options?: LoadAllOptions,
): Promise<LoadAllResult>;
```

Runs `load()` once per requested dataset. The factory is called per
dataset to mint a fresh sink — typical pattern is
`(dataset) => storage.createSink(dataset)`.

`onError: 'abort'` (default) stops on the first failure; `'skip'`
records the error in `results[].error` and continues.

### `createCheckers(datasets?)`

Returns one `UpdateChecker` per dataset. Strategy:

- If the descriptor has an `md5Url` (clinvar, taxonomy, compounds) →
  `Md5ChecksumChecker(id, md5Url)` from `@ncbijs/sync` — content-based,
  cheap to poll.
- Otherwise (mesh, genes, id-mappings) → `HttpTimestampChecker(id, sourceUrls[0])`
  using HTTP `Last-Modified`.

Throws if a descriptor has no `sourceUrls[0]` and no `md5Url`.

### `listDatasets()` / `getDataset(id)`

Read-only metadata lookups against the registry. `getDataset` throws
`Error('Unknown dataset: <id>')` for an unregistered id.

## Configuration

This package has no constructor and reads no environment variables.
All configuration is per-call via `LoadOptions` / `LoadAllOptions`.
Rate limits, retries, and decompression are inherited from
`@ncbijs/pipeline`'s `createHttpSource`.

## Cross-package wiring

- **Composes `@ncbijs/pipeline`** for the actual ETL run
  (`createHttpSource`, `createCompositeSource`, `pipeline()`).
- **Composes `@ncbijs/sync`** through `createCheckers()` —
  `SyncScheduler` then drives `load()` on detected change.
- **Composes domain bulk parsers** — `parseMeshDescriptorXml`,
  `parseVariantSummaryTsv`, `parseGeneInfoTsv`, `parseTaxonomyDump`,
  `parseCompoundExtras`, `parsePmcIdsCsv`. Adding a dataset means
  importing one more parser here.
- **Pairs with `@ncbijs/store`** — `storage.createSink(dataset)`
  produces a typed DuckDB-backed sink whose schema matches the parser
  output. The dataset id is the same string on both sides.
- **Pairs with `@ncbijs/store-mcp`** — once `loadAll` has populated a
  DuckDB file, `store-mcp` exposes the same datasets as MCP tools.

## Common pitfalls

1. **`load('taxonomy', ...)` throws by design.** The taxonomy
   descriptor's `createSource` deliberately throws because the source
   is `taxdump.tar.gz` and `createHttpSource` cannot extract tar
   entries. Loaders must pre-extract `names.dmp` and `nodes.dmp` and
   build a `createCompositeSource({ namesDmp, nodesDmp })` themselves,
   then call `pipeline()` directly with `parseTaxonomyDump`. The
   descriptor's `parse` works against that composite shape.

2. **`transform` receives parsed records, not raw bytes.** The
   wrapped parse is `(raw) => transform(originalParse(raw))`. Trying
   to mutate the raw input or re-parse will produce nonsense — apply
   `transform` at the record level only.

3. **`loadAll` runs sequentially, not in parallel.** Datasets are
   loaded one after another via `for...of await`. This is intentional
   — concurrent loads against `ftp.ncbi.nlm.nih.gov` and
   `nlmpubs.nlm.nih.gov` risk rate-limit pushback and saturate disk
   I/O on the sink side. Do not "optimise" by parallelising without
   bounded concurrency.

4. **`onError: 'skip'` still aborts on the *next* dataset's failure.**
   The strategy is per-dataset, not per-batch. The pipeline-level
   error strategy (records that fail to parse or write) is owned by
   `@ncbijs/pipeline` — not surfaced through `LoadOptions`. If you
   need per-record skipping, call `pipeline()` directly with
   `onError: 'skip'`.

5. **`DatasetDescriptor` and `getDescriptor` are not exported.** They
   are private to the package. External consumers must add a dataset
   here, not extend the registry from outside. A future "user-supplied
   dataset" feature would need a real public registration API.

6. **The `EtlDatasetType` union is closed.** Adding a dataset is a
   breaking-ish change to the union (string-literal narrowing). Bump
   the minor version and update consumers' `LoadAllOptions.datasets`
   that hard-coded a subset.

7. **`createCheckers()` constructs network-bound checkers eagerly.**
   The constructors don't fetch, but each `UpdateChecker.check()`
   call hits `ftp.ncbi.nlm.nih.gov` (or `nlmpubs.nlm.nih.gov` for
   mesh). Don't poll all six at sub-minute intervals.

8. **MeSH year is hard-coded** (`desc2026.xml`). When NCBI publishes
   the next annual MeSH release, `MESH_URL` in `dataset-registry.ts`
   must be bumped. There is no runtime fallback — an out-of-date URL
   will 404 against NLM.

## Testing

```bash
pnpm nx run @ncbijs/etl:test
pnpm nx run @ncbijs/etl:typecheck
pnpm nx run @ncbijs/etl:build
```

Unit tests cover `load`, `loadAll`, `createCheckers`, and
`dataset-registry` (registry shape, `getDescriptor` error path,
checker selection per descriptor). 100 % coverage is required.

There are no package-level e2e specs — the live download path is
exercised through example scripts (`examples/data-pipeline/*.ts`)
rather than CI to keep CI off the NCBI FTP servers.

## Files

```
packages/etl/src/
  index.ts                       # public re-exports
  load.ts                        # load(): single-dataset pipeline runner
  load-all.ts                    # loadAll(): sequential multi-dataset runner
  create-checkers.ts             # createCheckers(): MD5 vs Last-Modified per dataset
  dataset-registry.ts            # REGISTRY, listDatasets, getDataset, getDescriptor
  load.spec.ts
  load-all.spec.ts
  create-checkers.spec.ts
  dataset-registry.spec.ts
  interfaces/
    etl.interface.ts             # EtlDatasetType + all option/result types
```
