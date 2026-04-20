# ncbijs Documentation

Technical guides for the ncbijs package ecosystem. Each guide covers one NCBI API or cross-cutting concern.

## NCBI API Guides

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

## Architecture and Development

| Guide                                           | Covers                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| [Architecture](./architecture.md)               | Monorepo structure, ESM-only rationale, dependency graph |
| [Type Safety](./type-safety.md)                 | Three-layer type pattern, format-dependent overloads     |
| [Testing Strategy](./testing-strategy.md)       | fetch mocking, XML fixtures, coverage targets            |
| [Release and Publish](./release-and-publish.md) | release-please, npm provenance, workspace protocol       |
