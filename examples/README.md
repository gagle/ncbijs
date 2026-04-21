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
| `rxnorm-drug-lookup.ts`           | `@ncbijs/rxnorm`          | Normalize drug names and check interactions             |
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
