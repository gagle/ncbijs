# ncbijs Documentation

Technical guides for the ncbijs package ecosystem. Each guide covers one NCBI API or cross-cutting concern.

## API Guides

In-depth guides for the most commonly used NCBI APIs:

| Guide                             | Covers                                                         | Package                |
| --------------------------------- | -------------------------------------------------------------- | ---------------------- |
| [E-utilities](./eutils.md)        | 9 NCBI E-utility endpoints, rate limiting, History Server      | `@ncbijs/eutils`       |
| [PubMed](./pubmed.md)             | Fluent query builder, search cap workaround, batch retrieval   | `@ncbijs/pubmed`       |
| [PubMed XML](./pubmed-xml.md)     | PubMed DTD edge cases, MEDLINE text format, streaming parser   | `@ncbijs/pubmed-xml`   |
| [PMC](./pmc.md)                   | Full-text retrieval, OA Service, OAI-PMH, FTP-to-S3 migration  | `@ncbijs/pmc`          |
| [JATS](./jats.md)                 | JATS XML versions, section nesting, chunking algorithm for RAG | `@ncbijs/jats`         |
| [PubTator](./pubtator.md)         | Entity search, BioC annotation export, free-text NER           | `@ncbijs/pubtator`     |
| [Citation Exporter](./cite.md)    | 4 citation formats (RIS, MEDLINE, CSL-JSON, Citation)          | `@ncbijs/cite`         |
| [ID Converter](./id-converter.md) | Batch PMID/PMCID/DOI/MID conversion                            | `@ncbijs/id-converter` |
| [MeSH](./mesh.md)                 | Vocabulary tree traversal, query expansion, SPARQL             | `@ncbijs/mesh`         |

## Data Pipelines

| Guide                                               | Covers                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| [Data Pipeline Guide](./pipeline.md)                | `@ncbijs/pipeline`, `@ncbijs/store`, and `@ncbijs/sync` API guide |
| [Bulk Parser Catalog](./data-pipelines.md)          | 21 bulk parsers, NCBI downloadable data inventory                 |
| [Pipeline Architecture](./pipeline-architecture.md) | Storage strategy pattern, sync engine design, data inventory      |

## Additional Packages

These packages have README documentation in their package directories. See each package's README for API details and usage examples.

### Biomedical databases

| Package                                          | Covers                                                   |
| ------------------------------------------------ | -------------------------------------------------------- |
| [`@ncbijs/datasets`](../packages/datasets)       | Genes, genomes, taxonomy, viruses, BioProject, BioSample |
| [`@ncbijs/blast`](../packages/blast)             | BLAST sequence alignment (submit/poll/retrieve)          |
| [`@ncbijs/snp`](../packages/snp)                 | dbSNP variation data — placements, alleles, frequencies  |
| [`@ncbijs/clinvar`](../packages/clinvar)         | ClinVar clinical variant significance and traits         |
| [`@ncbijs/pubchem`](../packages/pubchem)         | PubChem compounds, substances, and bioassays             |
| [`@ncbijs/protein`](../packages/protein)         | Protein sequences in FASTA and GenBank formats           |
| [`@ncbijs/nucleotide`](../packages/nucleotide)   | Nucleotide sequences in FASTA and GenBank formats        |
| [`@ncbijs/genbank`](../packages/genbank)         | GenBank flat file format parser (zero-dep)               |
| [`@ncbijs/fasta`](../packages/fasta)             | FASTA format parser (zero-dep)                           |
| [`@ncbijs/omim`](../packages/omim)               | OMIM genetic disorders and Mendelian inheritance         |
| [`@ncbijs/medgen`](../packages/medgen)           | MedGen medical genetics concepts                         |
| [`@ncbijs/gtr`](../packages/gtr)                 | Genetic Testing Registry                                 |
| [`@ncbijs/geo`](../packages/geo)                 | GEO gene expression datasets                             |
| [`@ncbijs/dbvar`](../packages/dbvar)             | dbVar structural variants                                |
| [`@ncbijs/sra`](../packages/sra)                 | SRA sequencing experiment metadata                       |
| [`@ncbijs/structure`](../packages/structure)     | 3D molecular structures from MMDB/PDB                    |
| [`@ncbijs/cdd`](../packages/cdd)                 | Conserved Domain Database                                |
| [`@ncbijs/books`](../packages/books)             | NCBI Bookshelf entries                                   |
| [`@ncbijs/nlm-catalog`](../packages/nlm-catalog) | NLM Catalog journal and serial records                   |

### Clinical and drug data

| Package                                                  | Covers                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| [`@ncbijs/clinical-trials`](../packages/clinical-trials) | ClinicalTrials.gov v2 — study search, stats, field values  |
| [`@ncbijs/icite`](../packages/icite)                     | NIH iCite citation metrics — RCR, percentiles              |
| [`@ncbijs/rxnorm`](../packages/rxnorm)                   | RxNorm drug normalization, interactions, NDC codes         |
| [`@ncbijs/litvar`](../packages/litvar)                   | LitVar2 variant-literature linking by rsID                 |
| [`@ncbijs/bioc`](../packages/bioc)                       | BioC annotated text with named entity recognition          |
| [`@ncbijs/clinical-tables`](../packages/clinical-tables) | Clinical Table Search — ICD-10, LOINC, SNOMED autocomplete |

### Infrastructure

| Package                                      | Covers                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| [`@ncbijs/pipeline`](../packages/pipeline)   | Data pipeline: Source → Parse → Sink with streaming support |
| [`@ncbijs/sync`](../packages/sync)           | NCBI update detection and scheduled re-sync                 |
| [`@ncbijs/store`](../packages/store)         | Storage interfaces and DuckDB implementation for local data |
| [`@ncbijs/store-mcp`](../packages/store-mcp) | MCP server for querying locally stored NCBI data            |
| [`@ncbijs/etl`](../packages/etl)             | Pre-wired NCBI data loaders: `load('mesh', mySink)`         |

## NCBI API Reference

| Guide                                             | Covers                                               |
| ------------------------------------------------- | ---------------------------------------------------- |
| [NCBI API Catalog](./ncbi-api-catalog.md)         | Every NCBI/NLM HTTP endpoint and bulk download URL   |
| [API Change Detection](./api-change-detection.md) | Versioning, deprecation signals, monitoring strategy |

## Architecture and Development

| Guide                                           | Covers                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| [Architecture](./architecture.md)               | Monorepo structure, ESM-only rationale, dependency graph |
| [Type Safety](./type-safety.md)                 | Three-layer type pattern, format-dependent overloads     |
| [Testing Strategy](./testing-strategy.md)       | fetch mocking, XML fixtures, coverage targets            |
| [Release and Publish](./release-and-publish.md) | release-please, npm provenance, workspace protocol       |
| [Adding a Package](./adding-a-package.md)       | Checklist for adding a new package to the monorepo       |
| [RAG Integration](./rag-integration.md)         | Ingestion enrichment, query augmentation, citation       |
