<h1 align="center">ncbijs</h1>

<p align="center">
  TypeScript clients for NCBI APIs — PubMed, PMC, BLAST, SNP, ClinVar, PubChem, Datasets, and more.
</p>

<p align="center">
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/gagle/ncbijs" alt="license" /></a>
  <a href="https://github.com/gagle/ncbijs/actions"><img src="https://img.shields.io/github/actions/workflow/status/gagle/ncbijs/ci.yml" alt="CI" /></a>
  <a href="./docs/rag-integration.md"><img src="https://img.shields.io/badge/RAG-Ready-blueviolet" alt="RAG Ready" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Server-blue" alt="MCP Server" /></a>
  <a href="./packages/mcp"><img src="https://img.shields.io/badge/LLM_Tools-18_tools-green" alt="LLM Tools" /></a>
</p>

---

## What is NCBI?

The [National Center for Biotechnology Information](https://www.ncbi.nlm.nih.gov/) (NCBI), part of the U.S. National Library of Medicine (NLM), maintains the world's largest collection of biomedical databases. These include **PubMed** (37M+ article citations), **PubMed Central** (PMC, 9M+ full-text articles), **MeSH** (controlled medical vocabulary), **BLAST** (sequence alignment), **dbSNP** (genetic variation), **ClinVar** (clinical variants), **PubChem** (chemical compounds), and many more. Researchers, clinicians, and developers rely on NCBI's public APIs to search, retrieve, and analyze biomedical data programmatically.

**ncbijs** provides typed, zero-dependency TypeScript clients for these APIs. It is designed for two audiences:

- **Developers and researchers** building biomedical applications, literature review tools, or clinical decision support systems.
- **LLM and AI agents** that need structured, programmatic access to biomedical literature for retrieval-augmented generation (RAG), entity extraction, and citation management.

### What can you do with ncbijs?

| Workflow                                              | Packages                            |
| ----------------------------------------------------- | ----------------------------------- |
| Search PubMed and retrieve article metadata           | `@ncbijs/pubmed` + `@ncbijs/eutils` |
| Fetch full-text articles from PMC                     | `@ncbijs/pmc` + `@ncbijs/jats`      |
| Extract genes, diseases, chemicals from articles      | `@ncbijs/pubtator`                  |
| Generate formatted citations (RIS, MEDLINE, CSL-JSON) | `@ncbijs/cite`                      |
| Convert between PMID, PMCID, and DOI                  | `@ncbijs/id-converter`              |
| Expand MeSH terms for comprehensive searches          | `@ncbijs/mesh`                      |
| Chunk full-text articles for RAG pipelines            | `@ncbijs/jats` (toChunks)           |
| Look up genes, genomes, and taxonomy                  | `@ncbijs/datasets`                  |
| Parse FASTA nucleotide/protein sequences              | `@ncbijs/fasta`                     |
| Run BLAST sequence alignments                         | `@ncbijs/blast`                     |
| Look up SNP/variant data from dbSNP                   | `@ncbijs/snp`                       |
| Query clinical variant significance from ClinVar      | `@ncbijs/clinvar`                   |
| Retrieve chemical compound data from PubChem          | `@ncbijs/pubchem`                   |
| Expose all tools to LLM agents via MCP                | `@ncbijs/mcp`                       |

## Packages

| Package                                           | Description                                                        | Version                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [`@ncbijs/pubmed`](./packages/pubmed)             | High-level PubMed search and retrieval with fluent query builder   | [![npm](https://img.shields.io/npm/v/@ncbijs/pubmed)](https://www.npmjs.com/package/@ncbijs/pubmed)             |
| [`@ncbijs/pmc`](./packages/pmc)                   | PMC full-text retrieval via E-utilities, OA Service, and OAI-PMH   | [![npm](https://img.shields.io/npm/v/@ncbijs/pmc)](https://www.npmjs.com/package/@ncbijs/pmc)                   |
| [`@ncbijs/eutils`](./packages/eutils)             | Spec-compliant client for all 9 NCBI E-utilities                   | [![npm](https://img.shields.io/npm/v/@ncbijs/eutils)](https://www.npmjs.com/package/@ncbijs/eutils)             |
| [`@ncbijs/cite`](./packages/cite)                 | Citation formatting in 4 styles (RIS, MEDLINE, CSL-JSON, Citation) | [![npm](https://img.shields.io/npm/v/@ncbijs/cite)](https://www.npmjs.com/package/@ncbijs/cite)                 |
| [`@ncbijs/id-converter`](./packages/id-converter) | Batch conversion between PMID, PMCID, DOI, and Manuscript ID       | [![npm](https://img.shields.io/npm/v/@ncbijs/id-converter)](https://www.npmjs.com/package/@ncbijs/id-converter) |
| [`@ncbijs/mesh`](./packages/mesh)                 | MeSH vocabulary tree traversal and query expansion                 | [![npm](https://img.shields.io/npm/v/@ncbijs/mesh)](https://www.npmjs.com/package/@ncbijs/mesh)                 |
| [`@ncbijs/pubtator`](./packages/pubtator)         | PubTator3 text mining — entity search and BioC annotation export   | [![npm](https://img.shields.io/npm/v/@ncbijs/pubtator)](https://www.npmjs.com/package/@ncbijs/pubtator)         |
| [`@ncbijs/pubmed-xml`](./packages/pubmed-xml)     | PubMed/MEDLINE XML and plain-text parser                           | [![npm](https://img.shields.io/npm/v/@ncbijs/pubmed-xml)](https://www.npmjs.com/package/@ncbijs/pubmed-xml)     |
| [`@ncbijs/jats`](./packages/jats)                 | JATS XML parser with markdown, plain-text, and RAG chunking        | [![npm](https://img.shields.io/npm/v/@ncbijs/jats)](https://www.npmjs.com/package/@ncbijs/jats)                 |
| [`@ncbijs/blast`](./packages/blast)               | BLAST sequence alignment with async submit/poll/retrieve workflow  | [![npm](https://img.shields.io/npm/v/@ncbijs/blast)](https://www.npmjs.com/package/@ncbijs/blast)               |
| [`@ncbijs/snp`](./packages/snp)                   | dbSNP variation data — placements, allele annotations, frequencies | [![npm](https://img.shields.io/npm/v/@ncbijs/snp)](https://www.npmjs.com/package/@ncbijs/snp)                   |
| [`@ncbijs/clinvar`](./packages/clinvar)           | ClinVar clinical variant significance, genes, traits, locations    | [![npm](https://img.shields.io/npm/v/@ncbijs/clinvar)](https://www.npmjs.com/package/@ncbijs/clinvar)           |
| [`@ncbijs/pubchem`](./packages/pubchem)           | PubChem compound data — properties, synonyms, descriptions         | [![npm](https://img.shields.io/npm/v/@ncbijs/pubchem)](https://www.npmjs.com/package/@ncbijs/pubchem)           |
| [`@ncbijs/datasets`](./packages/datasets)         | NCBI Datasets API v2 client for genes, genomes, and taxonomy       | [![npm](https://img.shields.io/npm/v/@ncbijs/datasets)](https://www.npmjs.com/package/@ncbijs/datasets)         |
| [`@ncbijs/fasta`](./packages/fasta)               | Zero-dependency FASTA format parser for sequences                  | [![npm](https://img.shields.io/npm/v/@ncbijs/fasta)](https://www.npmjs.com/package/@ncbijs/fasta)               |
| [`@ncbijs/xml`](./packages/xml)                   | Zero-dependency regex-based XML reader for NCBI formats            | [![npm](https://img.shields.io/npm/v/@ncbijs/xml)](https://www.npmjs.com/package/@ncbijs/xml)                   |
| [`@ncbijs/mcp`](./packages/mcp)                   | MCP server exposing all ncbijs tools for LLM agents                | [![npm](https://img.shields.io/npm/v/@ncbijs/mcp)](https://www.npmjs.com/package/@ncbijs/mcp)                   |
| [`@ncbijs/rate-limiter`](./packages/rate-limiter) | Token bucket rate limiter for browser and Node.js                  | [![npm](https://img.shields.io/npm/v/@ncbijs/rate-limiter)](https://www.npmjs.com/package/@ncbijs/rate-limiter) |

## RAG integration

ncbijs is built to power biomedical RAG (Retrieval-Augmented Generation) pipelines. Use it to enrich document chunks with named entities, normalize terminology via MeSH, validate claims against PubMed, and inject formatted citations into generated answers. The MCP server (`@ncbijs/mcp`) lets LLM agents call any ncbijs tool directly during generation with zero glue code.

See **[RAG Integration Guide](./docs/rag-integration.md)** for a full architecture walkthrough covering ingestion enrichment, query-time augmentation, generation-time citation, and priority assessment.

## Quick start

```bash
npm install @ncbijs/pubmed
```

```typescript
import { PubMed } from '@ncbijs/pubmed';

const pubmed = new PubMed({
  tool: 'my-research-app',
  email: 'you@university.edu',
});

const articles = await pubmed
  .search('CRISPR gene therapy')
  .dateRange('2023/01/01', '2024/12/31')
  .freeFullText()
  .limit(10)
  .fetchAll();

for (const article of articles) {
  console.log(`${article.pmid}: ${article.title}`);
}
```

## Architecture

Zero-dependency philosophy — most packages have zero runtime dependencies. `eutils` depends on `rate-limiter` + `openapi-fetch`. `datasets`, `blast`, `snp`, `clinvar`, and `pubchem` depend on `rate-limiter`. High-level packages (`pubmed`, `pmc`) depend only on internal `@ncbijs/*` packages.

### Dependency graph

```
xml ──────────────┬─ pubmed-xml ──┐
                  ├─ jats ────────┤
rate-limiter ─────┤               │
                  ├─ eutils ──┬─ pubmed (+ pubmed-xml)
                  │           ├─ pmc (+ jats)
                  │           └─ clinvar
                  ├─ pubtator
                  ├─ datasets
                  ├─ blast
                  ├─ snp
                  └─ pubchem

fasta, id-converter, mesh, cite  (zero-dep, independent)
```

### Build order

1. **Parallel**: `rate-limiter`, `xml`, `id-converter`, `mesh`, `cite`, `fasta`
2. **After deps**: `eutils`, `datasets`, `blast`, `snp`, `pubchem`, `pubmed-xml`, `jats`, `pubtator`
3. **After eutils**: `pubmed`, `pmc`, `clinvar`

## Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
```

### Single package

```bash
pnpm nx run @ncbijs/pubmed:build
pnpm nx run @ncbijs/pubmed:test
```

### E2E tests

E2E tests hit real NCBI APIs and require an API key:

```bash
cp .env.example .env
# Add your NCBI API key to .env
pnpm nx run ncbijs-e2e:e2e
```

Get an API key at [ncbi.nlm.nih.gov/account/settings](https://www.ncbi.nlm.nih.gov/account/settings/).
