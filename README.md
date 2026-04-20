<h1 align="center">ncbijs</h1>

<p align="center">
  TypeScript clients for NCBI biomedical literature APIs — PubMed, PMC, MeSH, PubTator, and more.
</p>

<p align="center">
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/gagle/ncbijs" alt="license" /></a>
  <a href="https://github.com/gagle/ncbijs/actions"><img src="https://img.shields.io/github/actions/workflow/status/gagle/ncbijs/ci.yml" alt="CI" /></a>
</p>

---

## What is NCBI?

The [National Center for Biotechnology Information](https://www.ncbi.nlm.nih.gov/) (NCBI), part of the U.S. National Library of Medicine (NLM), maintains the world's largest collection of biomedical databases. These include **PubMed** (37M+ article citations), **PubMed Central** (PMC, 9M+ full-text articles), **MeSH** (controlled medical vocabulary), and many more. Researchers, clinicians, and developers rely on NCBI's public APIs to search, retrieve, and analyze biomedical literature programmatically.

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
| [`@ncbijs/xml`](./packages/xml)                   | Zero-dependency regex-based XML reader for NCBI formats            | [![npm](https://img.shields.io/npm/v/@ncbijs/xml)](https://www.npmjs.com/package/@ncbijs/xml)                   |
| [`@ncbijs/rate-limiter`](./packages/rate-limiter) | Token bucket rate limiter for browser and Node.js                  | [![npm](https://img.shields.io/npm/v/@ncbijs/rate-limiter)](https://www.npmjs.com/package/@ncbijs/rate-limiter) |

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

Zero-dependency philosophy — 8 of 11 packages have zero runtime dependencies. The 2 high-level packages (`pubmed`, `pmc`) depend only on internal `@ncbijs/*` packages. `eutils` depends on `rate-limiter`, `xml`, and `openapi-fetch`.

### Dependency graph

```
xml ──────────────┬─ pubmed-xml ──┐
                  ├─ jats ────────┤
rate-limiter ─────┤               │
                  ├─ eutils ──┬─ pubmed (+ pubmed-xml)
                  │           └─ pmc (+ jats)
                  └─ pubtator

id-converter, mesh, cite  (zero-dep, independent)
```

### Build order

1. **Parallel**: `rate-limiter`, `xml`, `id-converter`, `mesh`, `cite`
2. **After xml**: `eutils`, `pubmed-xml`, `jats`, `pubtator`
3. **After eutils**: `pubmed`, `pmc`

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

## License

MIT
