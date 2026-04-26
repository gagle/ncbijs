# @ncbijs/sync

> **Runtime**: Browser + Node.js

Watch NCBI data sources for updates and trigger pipeline re-runs.

## Quick Start

```typescript
import {
  SyncScheduler,
  HttpTimestampChecker,
  Md5ChecksumChecker,
  InMemorySyncState,
} from '@ncbijs/sync';

const checkers = [
  new HttpTimestampChecker('genes', 'https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz'),
  new Md5ChecksumChecker(
    'clinvar',
    'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz.md5',
  ),
];

const scheduler = new SyncScheduler(new InMemorySyncState(), checkers, {
  checkIntervalMs: 3600_000,
  datasets: ['genes', 'clinvar'],
  onUpdate: async (dataset) => {
    console.log(`${dataset} has new data — reload it`);
  },
  onError: (dataset, error) => {
    console.error(`${dataset} check failed: ${error.message}`);
  },
});

await scheduler.start();
```

## API

### `SyncScheduler`

Periodically checks registered datasets for updates and calls `onUpdate` when changes are detected.

- `start()` — runs an immediate check, then polls at `checkIntervalMs`
- `stop()` — clears the polling interval
- `checkOnce()` — runs a single check cycle, returns the dataset names that had updates

State transitions per dataset: `idle` → `checking` → `syncing` → `idle` (or `error`).

### `HttpTimestampChecker`

Sends an HTTP `HEAD` request and compares the `Last-Modified` header against the stored value. Works with all NCBI FTP files (universal).

```typescript
new HttpTimestampChecker(dataset: string, url: string)
```

### `Md5ChecksumChecker`

Downloads a tiny `.md5` companion file (~50 bytes) and compares the checksum against the stored value. More reliable than timestamps for detecting actual content changes.

```typescript
new Md5ChecksumChecker(dataset: string, md5Url: string)
```

Available `.md5` companions on NCBI FTP:

| Dataset           | MD5 URL                      |
| ----------------- | ---------------------------- |
| ClinVar           | `variant_summary.txt.gz.md5` |
| Taxonomy          | `taxdump.tar.gz.md5`         |
| PubChem SMILES    | `CID-SMILES.gz.md5`          |
| PubChem InChI-Key | `CID-InChI-Key.gz.md5`       |
| PubChem IUPAC     | `CID-IUPAC.gz.md5`           |

### `InMemorySyncState`

In-memory implementation of `SyncStateStore`. State is lost on process restart. For persistent state, implement the `SyncStateStore` interface with your own storage backend.

### Interfaces

#### `UpdateChecker`

```typescript
interface UpdateChecker {
  readonly dataset: string;
  readonly check: (currentState: DatasetSyncState) => Promise<UpdateCheckResult>;
}
```

#### `SyncStateStore`

```typescript
interface SyncStateStore {
  readonly getState: (dataset: string) => Promise<DatasetSyncState>;
  readonly setState: (dataset: string, state: Partial<DatasetSyncState>) => Promise<void>;
  readonly getAllStates: () => Promise<ReadonlyArray<DatasetSyncState>>;
}
```

## Wiring with @ncbijs/etl

See [`examples/data-pipeline/sync-watch.ts`](../../examples/data-pipeline/sync-watch.ts) for a complete example that watches all ETL datasets and auto-reloads into DuckDB when changes are detected.
