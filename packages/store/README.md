<h1 align="center">@ncbijs/store</h1>

<p align="center">
  Storage interfaces and DuckDB implementation for local NCBI data.
</p>

---

## What is this?

A storage abstraction for NCBI dataset records with a DuckDB reference implementation. Provides interfaces (`Storage`, `FileStorage`, `CloudStorage`) and a concrete `DuckDbFileStorage` class that stores MeSH descriptors, ClinVar variants, genes, taxonomy, PubChem compounds, and article ID mappings in a single `.duckdb` file.

## Installation

```bash
npm install @ncbijs/store
```

## Usage

```typescript
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('data/ncbijs.duckdb');

// Write records
await storage.writeRecords('mesh', descriptors);

// Look up by primary key
const record = await storage.getRecord('mesh', 'D000001');

// Search by field
const results = await storage.searchRecords('genes', {
  field: 'symbol',
  value: 'BRCA1',
  operator: 'eq',
});

// Get statistics
const stats = await storage.getStats();

await storage.close();
```

## Storage interfaces

```typescript
// Base contract (medium-agnostic)
interface Storage {
  writeRecords(dataset: DatasetType, records: ReadonlyArray<unknown>): Promise<void>;
  getRecord<T>(dataset: DatasetType, key: string): Promise<T | undefined>;
  searchRecords<T>(dataset: DatasetType, query: SearchQuery): Promise<ReadonlyArray<T>>;
  getStats(): Promise<ReadonlyArray<DatasetStats>>;
}

// File-based strategies
interface FileStorage extends Storage {
  readonly path: string;
  close(): Promise<void>;
}

// Cloud strategies (future)
interface CloudStorage extends Storage {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

## Supported datasets

| Dataset       | Table              | Primary key         | Description                 |
| ------------- | ------------------ | ------------------- | --------------------------- |
| `mesh`        | `mesh_descriptors` | `id` (VARCHAR)      | MeSH vocabulary descriptors |
| `clinvar`     | `clinvar_variants` | `uid` (VARCHAR)     | Clinical variant reports    |
| `genes`       | `genes`            | `gene_id` (INTEGER) | Gene metadata               |
| `taxonomy`    | `taxonomy`         | `tax_id` (INTEGER)  | Taxonomy nodes              |
| `compounds`   | `compounds`        | `cid` (INTEGER)     | PubChem compound properties |
| `id-mappings` | `id_mappings`      | Multi-column        | PMID/PMCID/DOI mappings     |

## Search operators

| Operator       | SQL              | Description     |
| -------------- | ---------------- | --------------- |
| `eq` (default) | `= $value`       | Exact match     |
| `contains`     | `LIKE '%value%'` | Substring match |
| `starts_with`  | `LIKE 'value%'`  | Prefix match    |

## Loading data

Use the download and load scripts to populate the store:

```bash
pnpm exec tsx examples/offline-data/download.ts
pnpm exec tsx examples/offline-data/load.ts
pnpm exec tsx examples/offline-data/verify.ts
```
