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

## Available examples

| Script                           | Package                | Description                                            |
| -------------------------------- | ---------------------- | ------------------------------------------------------ |
| `search-pubmed.ts`               | `@ncbijs/pubmed`       | Search PubMed and print top results                    |
| `search-with-filters.ts`         | `@ncbijs/pubmed`       | Query builder with author, date, and full-text filters |
| `batch-processing.ts`            | `@ncbijs/pubmed`       | Stream results in batches                              |
| `fetch-full-text.ts`             | `@ncbijs/pmc`          | Fetch a PMC article and convert to markdown            |
| `rag-chunking.ts`                | `@ncbijs/pmc`          | Chunk a PMC article for RAG pipelines                  |
| `convert-ids.ts`                 | `@ncbijs/id-converter` | Convert PMIDs to PMCIDs and DOIs                       |
| `export-citations.ts`            | `@ncbijs/cite`         | Generate APA and BibTeX citations                      |
| `mesh-expansion.ts`              | `@ncbijs/mesh`         | MeSH tree lookup and query expansion                   |
| `eutils-raw.ts`                  | `@ncbijs/eutils`       | Low-level ESearch + EFetch round-trip                  |
| `find-gene-disease-relations.ts` | `@ncbijs/pubtator`     | PubTator entity and relation mining                    |
