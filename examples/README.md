# ncbijs Examples

Runnable TypeScript scripts demonstrating every package in the monorepo.

## Prerequisites

```bash
git clone https://github.com/gagle/ncbijs.git
cd ncbijs
pnpm install
pnpm build
```

Set your NCBI API key (optional but recommended for higher rate limits):

```bash
export NCBI_API_KEY="your-api-key"
```

## Running an example

```bash
pnpm exec tsx examples/search-pubmed.ts
```

## Single-package examples

| Script                            | Package                   | Description                                             |
| --------------------------------- | ------------------------- | ------------------------------------------------------- |
| `search-pubmed.ts`                | `@ncbijs/pubmed`          | Search PubMed and print top results                     |
| `search-with-filters.ts`          | `@ncbijs/pubmed`          | Query builder with author, date, and full-text filters  |
| `batch-processing.ts`             | `@ncbijs/pubmed`          | Stream results in batches                               |
| `fetch-full-text.ts`              | `@ncbijs/pmc`             | Fetch a PMC article and convert to markdown             |
| `rag-chunking.ts`                 | `@ncbijs/pmc`             | Chunk a PMC article for RAG pipelines                   |
| `convert-ids.ts`                  | `@ncbijs/id-converter`    | Convert PMIDs to PMCIDs and DOIs                        |
| `export-citations.ts`             | `@ncbijs/cite`            | Fetch CSL-JSON metadata and pre-rendered citations      |
| `mesh-expansion.ts`               | `@ncbijs/mesh`            | MeSH tree lookup and query expansion                    |
| `eutils-raw.ts`                   | `@ncbijs/eutils`          | Low-level ESearch + EFetch round-trip                   |
| `annotate-entities.ts`            | `@ncbijs/pubtator`        | PubTator entity search and BioC annotation export       |
| `fasta-parse.ts`                  | `@ncbijs/fasta`           | Parse FASTA format sequences                            |
| `fasta-blast-pipeline.ts`         | `@ncbijs/fasta` + `blast` | Parse sequences and run BLAST alignment                 |
| `genbank-parse.ts`                | `@ncbijs/genbank`         | Parse GenBank flat file records                         |
| `blast-search.ts`                 | `@ncbijs/blast`           | Submit BLAST search and retrieve results                |
| `snp-variant.ts`                  | `@ncbijs/snp`             | Look up SNP variants with frequencies and clinical data |
| `snp-variant-conversion.ts`       | `@ncbijs/snp`             | Convert between SPDI, HGVS, and VCF notations           |
| `clinvar-variants.ts`             | `@ncbijs/clinvar`         | Query ClinVar for clinical variant significance         |
| `clinvar-snp-analysis.ts`         | `@ncbijs/clinvar` + `snp` | Combined ClinVar + dbSNP variant analysis               |
| `pubchem-compound.ts`             | `@ncbijs/pubchem`         | Look up compound properties by name, CID, SMILES        |
| `pubchem-annotations.ts`          | `@ncbijs/pubchem`         | Fetch PUG View compound annotations (GHS, patents)      |
| `datasets-gene-lookup.ts`         | `@ncbijs/datasets`        | Look up gene metadata via Datasets API v2               |
| `protein-fetch.ts`                | `@ncbijs/protein`         | Fetch protein sequences in FASTA and GenBank formats    |
| `nucleotide-fetch.ts`             | `@ncbijs/nucleotide`      | Fetch nucleotide sequences in FASTA and GenBank formats |
| `omim-search.ts`                  | `@ncbijs/omim`            | Search OMIM genetic disorders                           |
| `medgen-concept.ts`               | `@ncbijs/medgen`          | Query MedGen medical genetics concepts                  |
| `gtr-search.ts`                   | `@ncbijs/gtr`             | Search genetic testing registry                         |
| `geo-search.ts`                   | `@ncbijs/geo`             | Search GEO gene expression datasets                     |
| `dbvar-variant.ts`                | `@ncbijs/dbvar`           | Query dbVar structural variants                         |
| `sra-experiment.ts`               | `@ncbijs/sra`             | Search SRA sequencing experiments                       |
| `structure-search.ts`             | `@ncbijs/structure`       | Look up 3D molecular structures                         |
| `cdd-search.ts`                   | `@ncbijs/cdd`             | Search conserved protein domains                        |
| `books-search.ts`                 | `@ncbijs/books`           | Search NCBI Bookshelf entries                           |
| `nlm-catalog-search.ts`           | `@ncbijs/nlm-catalog`     | Look up NLM Catalog journal records                     |
| `eutils-history-server.ts`        | `@ncbijs/eutils`          | History Server pipeline with searchAndFetch             |
| `clinical-trials-search.ts`       | `@ncbijs/clinical-trials` | Search ClinicalTrials.gov by condition and phase        |
| `icite-metrics.ts`                | `@ncbijs/icite`           | Retrieve NIH iCite citation impact metrics              |
| `rxnorm-drug-lookup.ts`           | `@ncbijs/rxnorm`          | Normalize drug names and find drug classes              |
| `dailymed-drug-labels.ts`         | `@ncbijs/dailymed`        | Search drug labels, SPLs, and NDC packaging             |
| `litvar-variant-literature.ts`    | `@ncbijs/litvar`          | Find literature linked to genetic variants              |
| `bioc-annotated-text.ts`          | `@ncbijs/bioc`            | Retrieve annotated articles with named entities         |
| `clinical-tables-autocomplete.ts` | `@ncbijs/clinical-tables` | Autocomplete ICD-10, LOINC, SNOMED codes                |

## Multi-package workflows

| Script                        | Packages                               | Description                                          |
| ----------------------------- | -------------------------------------- | ---------------------------------------------------- |
| `literature-to-entities.ts`   | `pubmed` + `id-converter` + `pubtator` | Search articles, check PMC availability, extract NER |
| `full-text-rag-pipeline.ts`   | `pubmed` + `id-converter` + `pmc`      | Search, fetch full text, chunk for RAG/embeddings    |
| `citation-database.ts`        | `pubmed` + `cite` + `id-converter`     | Build publication records with citations and all IDs |
| `gene-literature-pipeline.ts` | `datasets` + `pubmed` + `pubtator`     | Gene lookup, literature search, entity extraction    |
| `compound-literature.ts`      | `pubchem` + `pubmed` + `id-converter`  | Compound lookup, find related literature, get DOIs   |

## Storage queries

Query locally stored NCBI data using the same `@ncbijs/*` package API — no network, no rate limits. These examples use `fromStorage()` to point domain packages at a local DuckDB database pre-loaded with NCBI data.

**Prerequisites**: Build the sample database first: `cd demo && pnpm build-data` (or load data via `@ncbijs/etl`).

| Script                      | Package                                  | Description                                           |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `storage-query-genes.ts`    | `@ncbijs/datasets` + `@ncbijs/store`     | Query genes and taxonomy from local DuckDB            |
| `storage-query-mesh.ts`     | `@ncbijs/mesh` + `@ncbijs/store`         | Search MeSH descriptors from local DuckDB             |
| `storage-query-clinvar.ts`  | `@ncbijs/clinvar` + `@ncbijs/store`      | Search ClinVar variants from local DuckDB             |
| `storage-query-compound.ts` | `@ncbijs/pubchem` + `@ncbijs/store`      | Look up PubChem compound properties from local DuckDB |
| `storage-convert-ids.ts`    | `@ncbijs/id-converter` + `@ncbijs/store` | Convert PMIDs from local DuckDB                       |

## Data pipeline

The `data-pipeline/` directory contains a 3-step pipeline that downloads NCBI bulk data, loads it into a local DuckDB database, and verifies the result. Once loaded, the data is queryable locally via `@ncbijs/store` or through the `@ncbijs/store-mcp` MCP server.

| Script                            | Packages                                                       | Description                                |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| `data-pipeline/http-to-duckdb.ts` | `pipeline` + `clinvar` + `datasets` + `id-converter` + `store` | Stream HTTP → parse → DuckDB (no download) |
| `data-pipeline/download.ts`       | Node.js built-ins                                              | Download ~4.4 GB from NCBI FTP servers     |
| `data-pipeline/load.ts`           | `pipeline` + `store` + parsers                                 | Parse local files and load into DuckDB     |
| `data-pipeline/verify.ts`         | `store`                                                        | Spot-check queries against loaded data     |
| `data-pipeline/sync-watch.ts`     | `sync` + `etl` + `store`                                       | Watch for NCBI updates and auto-reload     |

See [`data-pipeline/README.md`](./data-pipeline/README.md) for full setup and MCP server integration instructions.
