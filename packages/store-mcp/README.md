<h1 align="center">@ncbijs/store-mcp</h1>

<p align="center">
  MCP server for querying locally stored NCBI data via DuckDB.
</p>

---

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants access to locally stored NCBI data. Query MeSH descriptors, ClinVar variants, genes, taxonomy, PubChem compounds, and article ID mappings without API rate limits.

Complementary to `@ncbijs/http-mcp` (live API access). Use `store-mcp` for offline/local queries and `http-mcp` for real-time API access.

## Quick start

1. Download and load NCBI data:

```bash
pnpm exec tsx examples/offline-data/download.ts
pnpm exec tsx examples/offline-data/load.ts
```

2. Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "ncbijs-store": {
      "command": "npx",
      "args": ["-y", "@ncbijs/store-mcp"],
      "env": {
        "NCBIJS_DB_PATH": "/path/to/ncbijs.duckdb"
      }
    }
  }
}
```

## Environment variables

| Variable         | Required | Default              | Description                      |
| ---------------- | -------- | -------------------- | -------------------------------- |
| `NCBIJS_DB_PATH` | No       | `data/ncbijs.duckdb` | Path to the DuckDB database file |

## Available tools

### MeSH vocabulary

| Tool                | Description                                     |
| ------------------- | ----------------------------------------------- |
| `store-lookup-mesh` | Look up a MeSH descriptor by ID (e.g., D000001) |
| `store-search-mesh` | Search MeSH descriptors by name                 |

### Clinical variants

| Tool                    | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `store-lookup-variant`  | Look up a ClinVar variant by UID                      |
| `store-search-variants` | Search variants by clinical significance, title, etc. |

### Genes

| Tool                 | Description                                 |
| -------------------- | ------------------------------------------- |
| `store-lookup-gene`  | Look up a gene by NCBI Gene ID              |
| `store-search-genes` | Search genes by symbol, description, tax ID |

### Taxonomy

| Tool                    | Description                            |
| ----------------------- | -------------------------------------- |
| `store-lookup-taxonomy` | Look up a taxonomy node by tax ID      |
| `store-search-taxonomy` | Search taxonomy by organism name, rank |

### Chemistry

| Tool                     | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `store-lookup-compound`  | Look up a PubChem compound by CID                 |
| `store-search-compounds` | Search compounds by InChI key, IUPAC name, SMILES |

### ID conversion

| Tool                | Description                                     |
| ------------------- | ----------------------------------------------- |
| `store-convert-ids` | Convert between PMID, PMCID, DOI, Manuscript ID |
| `store-search-ids`  | Search ID mappings by field                     |

### Statistics

| Tool          | Description                               |
| ------------- | ----------------------------------------- |
| `store-stats` | Get record counts for all loaded datasets |

## Example prompts

- "Look up MeSH descriptor D000001"
- "Search for genes with symbol BRCA1 in the local store"
- "What ClinVar variants are marked as Pathogenic?"
- "Look up the taxonomy for tax ID 9606"
- "What compound has CID 2244?"
- "Convert PMID 12345678 to PMCID"
- "How many records are loaded in the store?"
