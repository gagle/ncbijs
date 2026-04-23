# Offline Data Pipeline

Download NCBI bulk data, parse it with ncbijs bulk parsers, and load it into a local DuckDB database for offline querying with zero API rate limits.

## Datasets

| Dataset           | Source                               | Compressed size | Records         |
| ----------------- | ------------------------------------ | --------------- | --------------- |
| MeSH descriptors  | `nlmpubs.nlm.nih.gov/projects/mesh/` | ~360 MB         | 30K descriptors |
| PMC ID mappings   | `/pub/pmc/PMC-ids.csv.gz`            | ~233 MB         | 9.5M mappings   |
| ClinVar variants  | `/pub/clinvar/tab_delimited/`        | ~150 MB         | 2.5M variants   |
| Gene info         | `/gene/DATA/gene_info.gz`            | ~600 MB         | 35M+ genes      |
| Taxonomy          | `/pub/taxonomy/taxdump.tar.gz`       | ~80 MB          | 2.5M+ taxa      |
| PubChem compounds | `/pubchem/Compound/Extras/`          | ~15 GB          | 115M+ compounds |

Total: ~4.4 GB compressed download, ~2 GB DuckDB file after loading.

## Prerequisites

```bash
pnpm install
pnpm build
```

## Step 1: Download

```bash
pnpm exec tsx examples/offline-data/download.ts
```

Downloads all datasets to `data/raw/` by default. Use `--output-dir <path>` to change the destination.

After downloading, extract the taxonomy dump manually:

```bash
tar -xzf data/raw/taxdump.tar.gz -C data/raw names.dmp nodes.dmp
```

Already-downloaded files are skipped, so you can safely re-run the script to resume after interruptions.

## Step 2: Load into DuckDB

```bash
pnpm exec tsx examples/offline-data/load.ts
```

Parses raw files with ncbijs bulk parsers and writes records into `data/ncbijs.duckdb`. Use `--input-dir <path>` and `--db-path <path>` to customize paths.

Missing datasets are skipped automatically. You can load a subset by downloading only the datasets you need.

## Step 3: Verify

```bash
pnpm exec tsx examples/offline-data/verify.ts
```

Runs spot-check queries against each loaded dataset: record lookups by primary key, searches by field, and record count summaries. Use `--db-path <path>` to point at a custom database.

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
