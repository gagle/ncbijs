<h1 align="center">@ncbijs/etl</h1>

> **Runtime**: Browser + Node.js

<p align="center">
  Pre-wired NCBI data loaders — one function call to download, parse, and sink any dataset.
</p>

---

## What is this?

Using `@ncbijs/pipeline` directly requires knowing the NCBI FTP URL, the correct parser function, and how to wire them together. `@ncbijs/etl` encapsulates all of that: you only provide the destination.

```typescript
import { load } from '@ncbijs/etl';

await load('mesh', mySink);
```

The package ships a registry of 6 NCBI bulk datasets with their URLs, parsers, and source constructors. You bring the sink (DuckDB, a REST API, a file, anything that implements `Sink<object>`), and the ETL handles the rest.

## Installation

```bash
pnpm add @ncbijs/etl
```

## Quick start

### Load a single dataset

```typescript
import { load } from '@ncbijs/etl';
import { createSink } from '@ncbijs/pipeline';

const records: Array<object> = [];

await load(
  'clinvar',
  createSink(async (batch) => {
    records.push(...batch);
  }),
);
```

### Load all datasets into DuckDB

```typescript
import { loadAll } from '@ncbijs/etl';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('ncbi.duckdb');

const { results, totalDurationMs } = await loadAll((dataset) => storage.createSink(dataset));

for (const entry of results) {
  if (entry.error) {
    console.error(`${entry.dataset} failed:`, entry.error.message);
  } else {
    console.log(`${entry.dataset}: ${entry.result!.recordsProcessed} records`);
  }
}
```

## Available datasets

| ID            | Name              | Format | Compressed | Estimated size | Estimated records | Update frequency |
| ------------- | ----------------- | ------ | ---------- | -------------- | ----------------- | ---------------- |
| `mesh`        | MeSH Descriptors  | XML    | No         | ~360 MB        | ~30K descriptors  | Annual           |
| `clinvar`     | ClinVar Variants  | TSV    | Yes (.gz)  | ~150 MB        | ~2.5M submissions | Weekly           |
| `genes`       | Gene Info         | TSV    | Yes (.gz)  | ~600 MB        | ~35M genes        | Daily            |
| `taxonomy`    | Taxonomy          | tar.gz | Yes        | ~80 MB         | ~2.5M taxa        | Daily            |
| `compounds`   | PubChem Compounds | TSV    | Yes (.gz)  | ~15 GB         | ~115M compounds   | Weekly           |
| `id-mappings` | PMC ID Mappings   | CSV    | Yes (.gz)  | ~233 MB        | ~9.5M mappings    | Regular          |

## API

### `load(dataset, sink, options?)`

Load a single dataset from NCBI HTTP into the provided sink.

| Parameter            | Type                   | Description                                   |
| -------------------- | ---------------------- | --------------------------------------------- |
| `dataset`            | `EtlDatasetType`       | Dataset identifier (see table above)          |
| `sink`               | `Sink<object>`         | Target sink from `@ncbijs/pipeline`           |
| `options.transform`  | `(records) => records` | Filter or transform records before writing    |
| `options.signal`     | `AbortSignal`          | Cancel the pipeline                           |
| `options.batchSize`  | `number`               | Records per batch (default: pipeline default) |
| `options.onProgress` | `(event) => void`      | Progress callback                             |

Returns `Promise<PipelineResult>`.

### `loadAll(sinkFactory, options?)`

Load multiple (or all) datasets. The factory is called once per dataset to create its sink.

| Parameter                   | Type                            | Description                         |
| --------------------------- | ------------------------------- | ----------------------------------- |
| `sinkFactory`               | `(dataset) => Sink<object>`     | Creates a sink for each dataset     |
| `options.datasets`          | `ReadonlyArray<EtlDatasetType>` | Subset to load (default: all)       |
| `options.signal`            | `AbortSignal`                   | Cancel all pipelines                |
| `options.batchSize`         | `number`                        | Records per batch                   |
| `options.onDatasetComplete` | `(dataset, result) => void`     | Called after each dataset completes |
| `options.onError`           | `'abort' \| 'skip'`             | Error strategy (default: `'abort'`) |

Returns `Promise<LoadAllResult>`.

### `listDatasets()`

Returns metadata for all available datasets.

```typescript
import { listDatasets } from '@ncbijs/etl';

for (const dataset of listDatasets()) {
  console.log(`${dataset.name}: ${dataset.estimatedRecords}`);
}
```

### `getDataset(id)`

Returns metadata for a single dataset.

```typescript
import { getDataset } from '@ncbijs/etl';

const mesh = getDataset('mesh');
console.log(mesh.sourceUrls); // ['https://nlmpubs.nlm.nih.gov/...']
```

## Transform example

Filter ClinVar to only pathogenic human variants:

```typescript
await load('clinvar', mySink, {
  transform: (records) =>
    records.filter((record) => {
      const variant = record as { clinicalSignificance?: string };
      return variant.clinicalSignificance?.includes('Pathogenic');
    }),
});
```

## Taxonomy note

The taxonomy dataset is distributed as a `tar.gz` archive containing `names.dmp` and `nodes.dmp` files. The `createSource` in the registry throws with guidance because `createHttpSource` can decompress gzip but cannot extract tar entries. To load taxonomy, pre-extract the files and use `createCompositeSource` from `@ncbijs/pipeline` directly.
