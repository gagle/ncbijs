# ncbijs Documentation

Cross-cutting guides for the ncbijs package ecosystem.

**Per-package deep references** live at `packages/<name>/CLAUDE.md` (co-located with the code). For the full per-package catalogue with paths and dependencies, see the [packages table in root `CLAUDE.md`](../CLAUDE.md#packages) or the [packages table in root `README.md`](../README.md#packages).

**Per-script deep references** live at `scripts/<name>/CLAUDE.md` — e.g. [`scripts/ncbi-api-monitor/CLAUDE.md`](../scripts/ncbi-api-monitor/CLAUDE.md) for the API drift monitor.

## Data Pipelines

| Guide                                               | Covers                                                       |
| --------------------------------------------------- | ------------------------------------------------------------ |
| [Bulk Parser Catalog](./data-pipelines.md)          | 21 bulk parsers, NCBI downloadable data inventory            |
| [Pipeline Architecture](./pipeline-architecture.md) | Storage strategy pattern, sync engine design, data inventory |

## NCBI API Reference

| Guide                                     | Covers                                             |
| ----------------------------------------- | -------------------------------------------------- |
| [NCBI API Catalog](./ncbi-api-catalog.md) | Every NCBI/NLM HTTP endpoint and bulk download URL |

For drift detection strategy and the monitor script, see [`scripts/ncbi-api-monitor/CLAUDE.md`](../scripts/ncbi-api-monitor/CLAUDE.md).

## Architecture and Development

| Guide                                           | Covers                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| [Architecture](./architecture.md)               | Monorepo structure, ESM-only rationale, dependency graph |
| [Type Safety](./type-safety.md)                 | Three-layer type pattern, format-dependent overloads     |
| [Testing Strategy](./testing-strategy.md)       | fetch mocking, XML fixtures, coverage targets            |
| [Release and Publish](./release-and-publish.md) | `/release` skill, npm provenance, workspace protocol     |
| [Adding a Package](./adding-a-package.md)       | Checklist for adding a new package to the monorepo       |
| [RAG Integration](./rag-integration.md)         | Ingestion enrichment, query augmentation, citation       |
