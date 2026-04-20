# @ncbijs — Implementation Docs (LLM Reference)

> Temporary documentation for LLM consumption during implementation. Delete after all packages ship.

## Package Status

| Package                | Phase | Types | Tests | Impl | Ship |
| ---------------------- | ----- | ----- | ----- | ---- | ---- |
| `@ncbijs/eutils`       | 1     | -     | -     | -    | -    |
| `@ncbijs/pubmed-xml`   | 1     | -     | -     | -    | -    |
| `@ncbijs/pubmed`       | 1     | -     | -     | -    | -    |
| `@ncbijs/jats`         | 2     | -     | -     | -    | -    |
| `@ncbijs/pmc`          | 2     | -     | -     | -    | -    |
| `@ncbijs/id-converter` | 2     | -     | -     | -    | -    |
| `@ncbijs/pubtator`     | 3     | -     | -     | -    | -    |
| `@ncbijs/mesh`         | 3     | -     | -     | -    | -    |
| `@ncbijs/cite`         | 4     | -     | -     | -    | -    |
| `@ncbijs/mcp`          | 5     | -     | -     | -    | -    |

## Implementation Order

```
Phase 1 (Foundation):  eutils → pubmed-xml → pubmed
Phase 2 (Full Text):   jats → pmc → id-converter
Phase 3 (Mining):      pubtator → mesh
Phase 4 (Citations):   cite
Phase 5 (MCP):         mcp
```

## Dependency Graph

```
pubmed  ──→ eutils + pubmed-xml
pmc     ──→ eutils + jats
mcp     ──→ pubmed + pmc + pubtator + mesh
(all others are zero-dep)
```

## Doc Index

| File                                               | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| [architecture.md](./architecture.md)               | Monorepo structure, build strategy, ESM-only rationale       |
| [type-safety.md](./type-safety.md)                 | Typed HTTP layer pattern, three-layer type system            |
| [eutils.md](./eutils.md)                           | E-utilities spec: 9 endpoints, rate limiting, History Server |
| [pubmed-xml.md](./pubmed-xml.md)                   | PubMed DTD edge cases, MEDLINE format                        |
| [pubmed.md](./pubmed.md)                           | Query builder, search cap, History Server flow               |
| [jats.md](./jats.md)                               | JATS versions, section nesting, chunking algorithm           |
| [pmc.md](./pmc.md)                                 | OA Service, OAI-PMH, FTP→S3 transition                       |
| [pubtator.md](./pubtator.md)                       | 3 API layers, BioC format, entity/relation types             |
| [cite.md](./cite.md)                               | Citation Exporter, 9 formats, rate limit                     |
| [id-converter.md](./id-converter.md)               | Batch conversion, validation, 4 output formats               |
| [mesh.md](./mesh.md)                               | Tree data, SPARQL, REST Lookup, expansion algorithm          |
| [testing-strategy.md](./testing-strategy.md)       | fetch mocking, coverage, XML fixtures                        |
| [release-and-publish.md](./release-and-publish.md) | release-please, workspace:\*, provenance                     |
