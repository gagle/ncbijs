# Data Pipeline

Download NCBI bulk data, parse it with ncbijs bulk parsers, and load it into a local DuckDB database for local querying with zero API rate limits. Then keep it fresh by watching for upstream changes.

## Datasets

| Dataset           | Source                               | Compressed size | Records         | Update frequency |
| ----------------- | ------------------------------------ | --------------- | --------------- | ---------------- |
| MeSH descriptors  | `nlmpubs.nlm.nih.gov/projects/mesh/` | ~360 MB         | 30K descriptors | Annual           |
| PMC ID mappings   | `/pub/pmc/PMC-ids.csv.gz`            | ~233 MB         | 9.5M mappings   | Daily            |
| ClinVar variants  | `/pub/clinvar/tab_delimited/`        | ~150 MB         | 2.5M variants   | Weekly           |
| Gene info         | `/gene/DATA/gene_info.gz`            | ~600 MB         | 35M+ genes      | Daily            |
| Taxonomy          | `/pub/taxonomy/taxdump.tar.gz`       | ~80 MB          | 2.5M+ taxa      | Daily            |
| PubChem compounds | `/pubchem/Compound/Extras/`          | ~15 GB          | 115M+ compounds | Daily            |

Total: ~4.4 GB compressed download, ~2 GB DuckDB file after loading.

## Prerequisites

```bash
pnpm install
pnpm build
```

## Workflow overview

The pipeline has two phases: **initial load** (one-time) and **watch & sync** (long-running). They are separate processes:

```
Phase 1: Initial Load                    Phase 2: Watch & Sync
┌────────────────────────┐               ┌────────────────────────┐
│  http-to-duckdb.ts     │               │  sync-watch.ts         │
│  or download.ts + load │               │                        │
│                        │               │  Poll NCBI every hour  │
│  NCBI FTP ──→ DuckDB   │    then       │  Detect changes (MD5   │
│  (full bulk download)  │  ──────────→  │  or Last-Modified)     │
│                        │               │  Re-load only changed  │
└────────────────────────┘               │  datasets into DuckDB  │
                                         └────────────────────────┘
```

**Phase 1** populates the database from scratch. **Phase 2** keeps it up to date. Run Phase 1 first, then start Phase 2 as a background process.

## Phase 1: Initial load

Two approaches, pick one:

### Option A: HTTP-to-DuckDB (recommended)

Stream data directly from NCBI HTTP into DuckDB — no intermediate files on disk:

```bash
pnpm exec tsx examples/data-pipeline/http-to-duckdb.ts
```

Supports `--db-path <path>` and `--dataset <name>` (clinvar, id-mappings, genes) flags.

This approach uses `createHttpSource()` from `@ncbijs/pipeline` which auto-decompresses `.gz` responses via the Web Streams API (`DecompressionStream`). It works in both Node.js and browsers.

### Option B: Download + Load (for offline use)

#### Step 1: Download raw files

```bash
pnpm exec tsx examples/data-pipeline/download.ts
```

Downloads all datasets to `data/raw/` by default. Use `--output-dir <path>` to change the destination.

After downloading, extract the taxonomy dump manually:

```bash
tar -xzf data/raw/taxdump.tar.gz -C data/raw names.dmp nodes.dmp
```

Already-downloaded files are skipped, so you can safely re-run the script to resume after interruptions.

#### Step 2: Parse and load into DuckDB

```bash
pnpm exec tsx examples/data-pipeline/load.ts
```

Parses raw files with ncbijs bulk parsers and writes records into `data/ncbijs.duckdb`. Use `--input-dir <path>` and `--db-path <path>` to customize paths.

Missing datasets are skipped automatically. You can load a subset by downloading only the datasets you need.

### Verify the initial load

```bash
pnpm exec tsx examples/data-pipeline/verify.ts
```

Runs spot-check queries against each loaded dataset: record lookups by primary key, searches by field, and record count summaries. Use `--db-path <path>` to point at a custom database.

## Phase 2: Watch for updates

After the initial load, start the sync watcher to keep data fresh:

```bash
pnpm exec tsx examples/data-pipeline/sync-watch.ts
```

This is a long-running process that:

1. Polls NCBI sources on an interval (default: 1 hour)
2. Detects changes using MD5 checksums (ClinVar, Taxonomy, PubChem) or HTTP `Last-Modified` headers (all others)
3. Re-loads only the datasets that changed into DuckDB

Supports `--db-path <path>`, `--interval <minutes>`, and `--dataset <name>` flags.

**First-run behavior:** If no prior sync state exists (e.g., fresh start with `InMemorySyncState`), every dataset appears "new" and gets loaded. This means `sync-watch.ts` can technically replace Phase 1 for small datasets, but for large datasets (Gene, PubChem), running the initial load separately gives you progress reporting and error recovery.

**For production:** Implement the `SyncStateStore` interface with persistent storage (e.g., a DuckDB table) so restarts don't trigger a full reload. `InMemorySyncState` is for development and testing only.

## Querying with the MCP server

Once the database is loaded, use `@ncbijs/store-mcp` to expose it to Claude as 14 query tools:

```json
{
  "mcpServers": {
    "ncbijs-store": {
      "command": "npx",
      "args": ["-y", "@ncbijs/store-mcp"],
      "env": {
        "NCBIJS_DB_PATH": "/absolute/path/to/data/ncbijs.duckdb"
      }
    }
  }
}
```

Add this to your Claude Desktop settings or `.mcp.json` for Claude Code. Available tools:

| Tool                     | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `store-lookup-mesh`      | Look up MeSH descriptor by ID                     |
| `store-search-mesh`      | Search MeSH descriptors by name                   |
| `store-lookup-variant`   | Look up ClinVar variant by UID                    |
| `store-search-variants`  | Search variants by significance, gene, etc.       |
| `store-lookup-gene`      | Look up gene by NCBI Gene ID                      |
| `store-search-genes`     | Search genes by symbol, description, tax ID       |
| `store-lookup-taxonomy`  | Look up taxonomy node by tax ID                   |
| `store-search-taxonomy`  | Search taxonomy by organism name, rank            |
| `store-lookup-compound`  | Look up PubChem compound by CID                   |
| `store-search-compounds` | Search compounds by InChI key, IUPAC name, SMILES |
| `store-convert-ids`      | Convert between PMID, PMCID, DOI                  |
| `store-search-ids`       | Search ID mappings by field                       |
| `store-stats`            | Get record counts for all loaded datasets         |
