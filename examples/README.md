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
npx tsx examples/search-pubmed.ts
```

## Single-package examples

| Script                   | Package                | Description                                            |
| ------------------------ | ---------------------- | ------------------------------------------------------ |
| `search-pubmed.ts`       | `@ncbijs/pubmed`       | Search PubMed and print top results                    |
| `search-with-filters.ts` | `@ncbijs/pubmed`       | Query builder with author, date, and full-text filters |
| `batch-processing.ts`    | `@ncbijs/pubmed`       | Stream results in batches                              |
| `fetch-full-text.ts`     | `@ncbijs/pmc`          | Fetch a PMC article and convert to markdown            |
| `rag-chunking.ts`        | `@ncbijs/pmc`          | Chunk a PMC article for RAG pipelines                  |
| `convert-ids.ts`         | `@ncbijs/id-converter` | Convert PMIDs to PMCIDs and DOIs                       |
| `export-citations.ts`    | `@ncbijs/cite`         | Fetch CSL-JSON metadata and pre-rendered citations     |
| `mesh-expansion.ts`      | `@ncbijs/mesh`         | MeSH tree lookup and query expansion                   |
| `eutils-raw.ts`          | `@ncbijs/eutils`       | Low-level ESearch + EFetch round-trip                  |
| `annotate-entities.ts`   | `@ncbijs/pubtator`     | PubTator entity search and BioC annotation export      |

## Multi-package workflows

| Script                      | Packages                               | Description                                          |
| --------------------------- | -------------------------------------- | ---------------------------------------------------- |
| `literature-to-entities.ts` | `pubmed` + `id-converter` + `pubtator` | Search articles, check PMC availability, extract NER |
| `full-text-rag-pipeline.ts` | `pubmed` + `id-converter` + `pmc`      | Search, fetch full text, chunk for RAG/embeddings    |
| `citation-database.ts`      | `pubmed` + `cite` + `id-converter`     | Build publication records with citations and all IDs |
