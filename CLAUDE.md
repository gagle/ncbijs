# CLAUDE.md — agent entry point for ncbijs

This file is the **router and convention hub** for AI agents working in
this monorepo. It auto-loads at session start. Use it to discover the
right package for a task, then descend into `packages/{name}/CLAUDE.md`
for the deep API reference.

**Two-tier doc model.** `README.md` is human-facing (rendered on npm).
`CLAUDE.md` is agent-facing (auto-loaded by Claude Code). Don't merge
the audiences — they have different framings.

---

## What can you do with ncbijs?

Workflow → package mapping. Find your intent, jump into the package's
`CLAUDE.md` for full details.

<!-- sync-docs:workflows:start -->
| Workflow                                              | Packages                            |
| ----------------------------------------------------- | ----------------------------------- |
| Search PubMed and retrieve article metadata           | `@ncbijs/pubmed` + `@ncbijs/eutils` |
| Fetch full-text articles from PMC                     | `@ncbijs/pmc` + `@ncbijs/jats`      |
| Extract genes, diseases, chemicals from articles      | `@ncbijs/pubtator`                  |
| Generate formatted citations (RIS, MEDLINE, CSL-JSON) | `@ncbijs/cite`                      |
| Convert between PMID, PMCID, and DOI                  | `@ncbijs/id-converter`              |
| Expand MeSH terms for comprehensive searches          | `@ncbijs/mesh`                      |
| Chunk full-text articles for RAG pipelines            | `@ncbijs/jats (toChunks)`           |
| Look up genes, genomes, and taxonomy                  | `@ncbijs/datasets`                  |
| Parse FASTA nucleotide/protein sequences              | `@ncbijs/fasta`                     |
| Run BLAST sequence alignments                         | `@ncbijs/blast`                     |
| Look up SNP/variant data from dbSNP                   | `@ncbijs/snp`                       |
| Query clinical variant significance from ClinVar      | `@ncbijs/clinvar`                   |
| Retrieve compound, substance, and assay data          | `@ncbijs/pubchem`                   |
| Fetch protein sequences in FASTA or GenBank format    | `@ncbijs/protein`                   |
| Fetch nucleotide sequences in FASTA or GenBank format | `@ncbijs/nucleotide`                |
| Parse GenBank flat file records locally               | `@ncbijs/genbank`                   |
| Look up genetic disorders from OMIM                   | `@ncbijs/omim`                      |
| Query medical genetics concepts from MedGen           | `@ncbijs/medgen`                    |
| Search genetic tests from GTR                         | `@ncbijs/gtr`                       |
| Search gene expression datasets from GEO              | `@ncbijs/geo`                       |
| Query structural variants from dbVar                  | `@ncbijs/dbvar`                     |
| Search sequencing experiment metadata from SRA        | `@ncbijs/sra`                       |
| Look up 3D molecular structures from MMDB/PDB         | `@ncbijs/structure`                 |
| Search conserved protein domains from CDD             | `@ncbijs/cdd`                       |
| Search NCBI Bookshelf entries                         | `@ncbijs/books`                     |
| Look up journal/serial records from NLM Catalog       | `@ncbijs/nlm-catalog`               |
| Convert variant notations (HGVS, SPDI, VCF)           | `@ncbijs/snp`                       |
| Get full compound annotations (GHS, patents)          | `@ncbijs/pubchem`                   |
| Chain search-fetch pipelines via History Server       | `@ncbijs/eutils`                    |
| Search clinical trials by condition/intervention      | `@ncbijs/clinical-trials`           |
| Get citation metrics and impact scores                | `@ncbijs/icite`                     |
| Normalize drug names and find drug classes            | `@ncbijs/rxnorm`                    |
| Look up drug labels, SPLs, and NDC packaging          | `@ncbijs/dailymed`                  |
| Find literature linked to genetic variants            | `@ncbijs/litvar`                    |
| Get annotated text with entity recognition            | `@ncbijs/bioc`                      |
| Autocomplete ICD-10, LOINC, SNOMED codes              | `@ncbijs/clinical-tables`           |
| Store NCBI data locally in DuckDB                     | `@ncbijs/store`                     |
| Query stored data with the same package API           | `fromStorage() on domain packages`  |
| Build data pipelines (Source → Parse → Sink)          | `@ncbijs/pipeline`                  |
| Load any NCBI dataset with one function call          | `@ncbijs/etl`                       |
| Watch NCBI sources for updates and re-sync            | `@ncbijs/sync`                      |
| Expose all tools to LLM agents via MCP                | `@ncbijs/http-mcp`                  |
| Query local NCBI data via MCP                         | `@ncbijs/store-mcp`                 |
<!-- sync-docs:workflows:end -->

## Packages

Agent-flavored catalogue: package → path → one-line purpose → key
dependencies. (Human-facing version with npm badges lives in
[`README.md`](./README.md).)

<!-- sync-docs:packages:start -->
| Package                  | Path                          | Purpose                                                            | Depends on                                                |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `@ncbijs/bioc` | `packages/bioc` | BioC API client — annotated PubMed and PMC articles (named entity… | `@ncbijs/rate-limiter` |
| `@ncbijs/blast` | `packages/blast` | NCBI BLAST sequence alignment client. Async submit/poll/retrieve w… | `@ncbijs/rate-limiter` |
| `@ncbijs/books` | `packages/books` | Typed client for NCBI Bookshelf — search and fetch biomedical book… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/cdd` | `packages/cdd` | Typed client for NCBI Conserved Domain Database (CDD) — search and… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/cite` | `packages/cite` | Citation formatting in 4 styles (RIS, MEDLINE, CSL-JSON, NLM Citat… | `@ncbijs/rate-limiter`, `@ncbijs/pubmed-xml` |
| `@ncbijs/clinical-tables` | `packages/clinical-tables` | Typed client for the NLM Clinical Tables Search API. Autocomplete… | `@ncbijs/rate-limiter` |
| `@ncbijs/clinical-trials` | `packages/clinical-trials` | Typed client for the ClinicalTrials.gov v2 REST API. Search interv… | `@ncbijs/rate-limiter` |
| `@ncbijs/clinvar` | `packages/clinvar` | NCBI ClinVar clinical variant data — search and fetch variants via… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/dailymed` | `packages/dailymed` | Typed client for the FDA DailyMed REST API v2 — drug name search,… | `@ncbijs/rate-limiter` |
| `@ncbijs/datasets` | `packages/datasets` | Typed client for the NCBI Datasets API v2 — gene reports, taxonomy… | `@ncbijs/rate-limiter` |
| `@ncbijs/dbvar` | `packages/dbvar` | Typed client for NCBI dbVar — search and fetch structural variatio… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/etl` | `packages/etl` | Pre-wired NCBI dataset loaders. One function call to download, par… | `@ncbijs/pipeline`, `@ncbijs/sync`, `@ncbijs/mesh`, `@ncbijs/clinvar`, `@ncbijs/datasets`, `@ncbijs/pubchem`, `@ncbijs/id-converter` |
| `@ncbijs/eutils` | `packages/eutils` | Spec-compliant client for all 9 NCBI E-utilities (esearch, efetch,… | `@ncbijs/rate-limiter`, `openapi-fetch` |
| `@ncbijs/fasta` | `packages/fasta` | Zero-dependency FASTA format parser. Pure synchronous function: st… | (zero-dep) |
| `@ncbijs/genbank` | `packages/genbank` | Zero-dependency parser for the NCBI GenBank flat-file format. Spli… | (zero-dep) |
| `@ncbijs/geo` | `packages/geo` | Typed client for NCBI Gene Expression Omnibus (GEO) — search and f… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/gtr` | `packages/gtr` | Typed client for the NCBI Genetic Testing Registry (GTR) — search… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/http-mcp` | `packages/http-mcp` | Model Context Protocol server exposing ncbijs domain packages as L… | `@modelcontextprotocol/sdk`, `@ncbijs/blast`, `@ncbijs/cite`, `@ncbijs/clinvar`, `@ncbijs/datasets`, `@ncbijs/icite`, `@ncbijs/id-converter`, `@ncbijs/litvar`, `@ncbijs/mesh`, `@ncbijs/pmc`, `@ncbijs/pubchem`, `@ncbijs/pubmed`, `@ncbijs/pubtator`, `@ncbijs/rxnorm`, `@ncbijs/snp` |
| `@ncbijs/icite` | `packages/icite` | Typed client for the NIH iCite API. Retrieve citation metrics — Re… | `@ncbijs/rate-limiter` |
| `@ncbijs/id-converter` | `packages/id-converter` | Batch conversion between PMID, PMCID, DOI, and NIH Manuscript ID v… | `@ncbijs/rate-limiter` |
| `@ncbijs/jats` | `packages/jats` | Parser for JATS XML (NISO Z39.96) full-text articles with markdown… | `@ncbijs/xml` |
| `@ncbijs/litvar` | `packages/litvar` | LitVar2 client — links genetic variants (rsIDs) to PubMed/PMC lite… | `@ncbijs/rate-limiter` |
| `@ncbijs/medgen` | `packages/medgen` | Typed client for NCBI MedGen medical-genetics concepts — search an… | `@ncbijs/eutils`, `@ncbijs/rate-limiter`, `@ncbijs/xml` |
| `@ncbijs/mesh` | `packages/mesh` | NLM Medical Subject Headings (MeSH) vocabulary — tree traversal, q… | `@ncbijs/rate-limiter` |
| `@ncbijs/nlm-catalog` | `packages/nlm-catalog` | Typed client for NLM Catalog — search and fetch journal and serial… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/nucleotide` | `packages/nucleotide` | Typed client for the NCBI Nucleotide database. Fetches DNA/RNA seq… | `@ncbijs/eutils`, `@ncbijs/fasta`, `@ncbijs/genbank`, `@ncbijs/rate-limiter` |
| `@ncbijs/omim` | `packages/omim` | Typed client for NCBI OMIM (Online Mendelian Inheritance in Man) —… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/pipeline` | `packages/pipeline` | Composable streaming ETL primitive — Source → Parse → Sink. Zero d… | (zero-dep) |
| `@ncbijs/pmc` | `packages/pmc` | PMC full-text article retrieval over three NCBI surfaces (E-utilit… | `@ncbijs/eutils`, `@ncbijs/jats`, `@ncbijs/rate-limiter`, `@ncbijs/xml` |
| `@ncbijs/protein` | `packages/protein` | Typed client for the NCBI Protein database. Fetches sequences via… | `@ncbijs/eutils`, `@ncbijs/fasta`, `@ncbijs/genbank`, `@ncbijs/rate-limiter` |
| `@ncbijs/pubchem` | `packages/pubchem` | Typed client for the PubChem PUG REST and PUG View APIs — compound… | `@ncbijs/rate-limiter` |
| `@ncbijs/pubmed` | `packages/pubmed` | High-level PubMed search and retrieval client. Fluent query builde… | `@ncbijs/eutils`, `@ncbijs/pubmed-xml` |
| `@ncbijs/pubmed-xml` | `packages/pubmed-xml` | Spec-compliant pure parser for PubMed/MEDLINE XML and MEDLINE plai… | `@ncbijs/xml` |
| `@ncbijs/pubtator` | `packages/pubtator` | Client for the PubTator3 text-mining API — biomedical entity autoc… | `@ncbijs/rate-limiter`, `@ncbijs/xml` |
| `@ncbijs/rate-limiter` | `packages/rate-limiter` | Zero-dependency token-bucket rate limiter and retry-aware fetch he… | (zero-dep) |
| `@ncbijs/rxnorm` | `packages/rxnorm` | Typed client for the NLM RxNav RxNorm REST API. Resolve drug names… | `@ncbijs/rate-limiter` |
| `@ncbijs/snp` | `packages/snp` | NCBI dbSNP Variation Services API client (RefSNP reports, allele p… | `@ncbijs/rate-limiter` |
| `@ncbijs/sra` | `packages/sra` | Typed client for NCBI SRA (Sequence Read Archive) — search and fet… | `@ncbijs/eutils`, `@ncbijs/rate-limiter`, `@ncbijs/xml` |
| `@ncbijs/store` | `packages/store` | Storage interfaces (Storage / ReadableStorage / WritableStorage /… | `@duckdb/node-api` |
| `@ncbijs/store-mcp` | `packages/store-mcp` | Model Context Protocol server exposing locally stored NCBI data (D… | `@modelcontextprotocol/sdk`, `@ncbijs/store`, `zod` |
| `@ncbijs/structure` | `packages/structure` | Typed client for NCBI Structure (MMDB / PDB) — search and fetch ma… | `@ncbijs/eutils`, `@ncbijs/rate-limiter` |
| `@ncbijs/sync` | `packages/sync` | NCBI update detection and scheduled re-sync. Polls upstream source… | (zero-dep) |
| `@ncbijs/xml` | `packages/xml` | Zero-dependency regex-based XML reader for NCBI formats — no HTTP,… | (zero-dep) |
<!-- sync-docs:packages:end -->

## Which package do I need?

<!-- sync-docs:decision-tree:start -->
```
I want to...
│
├── Search biomedical literature
│   ├── High-level PubMed search ────────────────→ @ncbijs/pubmed
│   ├── Low-level Entrez queries ────────────────→ @ncbijs/eutils
│   └── Find literature by genetic variant ──────→ @ncbijs/litvar
│
├── Retrieve full-text articles
│   ├── PMC open-access articles ────────────────→ @ncbijs/pmc
│   └── Annotated text with NER ─────────────────→ @ncbijs/bioc
│
├── Extract entities from text
│   ├── Genes, diseases, chemicals ──────────────→ @ncbijs/pubtator
│   └── Annotated passages (BioC format) ────────→ @ncbijs/bioc
│
├── Work with citations
│   ├── Format citations (RIS, CSL, etc.) ───────→ @ncbijs/cite
│   ├── Convert PMID/PMCID/DOI ──────────────────→ @ncbijs/id-converter
│   └── Citation impact metrics (RCR) ───────────→ @ncbijs/icite
│
├── Work with genes and sequences
│   ├── Gene/genome metadata ────────────────────→ @ncbijs/datasets
│   ├── Protein sequences ───────────────────────→ @ncbijs/protein
│   ├── Nucleotide sequences ────────────────────→ @ncbijs/nucleotide
│   ├── Sequence alignment (BLAST) ──────────────→ @ncbijs/blast
│   ├── Parse FASTA format ──────────────────────→ @ncbijs/fasta
│   └── Parse GenBank format ────────────────────→ @ncbijs/genbank
│
├── Work with variants and clinical data
│   ├── SNP/variant lookup (dbSNP) ──────────────→ @ncbijs/snp
│   ├── HGVS/SPDI/VCF conversion ────────────────→ @ncbijs/snp
│   ├── Clinical significance (ClinVar) ─────────→ @ncbijs/clinvar
│   ├── Genetic disorders (OMIM) ────────────────→ @ncbijs/omim
│   └── Medical genetics (MedGen) ───────────────→ @ncbijs/medgen
│
├── Work with drugs and chemicals
│   ├── Compound properties ─────────────────────→ @ncbijs/pubchem
│   ├── Compound annotations (GHS, etc.) ────────→ @ncbijs/pubchem
│   ├── Drug normalization (RxCUI) ──────────────→ @ncbijs/rxnorm
│   ├── Drug classes (ATC, VA, MEDRT) ───────────→ @ncbijs/rxnorm
│   ├── NDC code lookup ─────────────────────────→ @ncbijs/rxnorm
│   └── Drug labels and SPLs ────────────────────→ @ncbijs/dailymed
│
├── Autocomplete medical codes
│   ├── ICD-10, LOINC, SNOMED ───────────────────→ @ncbijs/clinical-tables
│   └── RxTerms drug names ──────────────────────→ @ncbijs/clinical-tables
│
├── Search clinical trials ──────────────────→ @ncbijs/clinical-trials
│
├── Work with vocabularies
│   └── MeSH term expansion ─────────────────────→ @ncbijs/mesh
│
├── Search other NCBI databases
│   ├── Gene expression (GEO) ───────────────────→ @ncbijs/geo
│   ├── Structural variants (dbVar) ─────────────→ @ncbijs/dbvar
│   ├── Sequencing data (SRA) ───────────────────→ @ncbijs/sra
│   ├── 3D structures (MMDB/PDB) ────────────────→ @ncbijs/structure
│   ├── Protein domains (CDD) ───────────────────→ @ncbijs/cdd
│   ├── Genetic tests (GTR) ─────────────────────→ @ncbijs/gtr
│   ├── Books/textbooks ─────────────────────────→ @ncbijs/books
│   └── Journal records (NLM Catalog) ───────────→ @ncbijs/nlm-catalog
│
├── Store NCBI data locally ─────────────────→ @ncbijs/store
│
├── Query stored data with same API ─────────→ fromStorage() on domain packages
│
├── Data pipeline (Source → Parse → Sink) ───→ @ncbijs/pipeline
│
├── Load any NCBI dataset in one call ───────→ @ncbijs/etl
│
├── Watch NCBI sources for updates ──────────→ @ncbijs/sync
│
├── Expose tools to LLM agents (live API) ───→ @ncbijs/http-mcp
│
└── Query local data via MCP ────────────────→ @ncbijs/store-mcp
```
<!-- sync-docs:decision-tree:end -->

---

## How agent context is layered

Five surfaces, each with a specific loading semantic. Touch the right one
for the right job.

| Surface                     | Loaded when                                       | Use for                                                                       |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `CLAUDE.md` (root, this file) | Always (every turn)                             | Routing, conventions, top-level architecture                                  |
| `packages/{name}/CLAUDE.md` | When agent works in `packages/{name}/`            | Deep API reference, cross-package wiring, common pitfalls, "when NOT to use"  |
| `apps/demo/CLAUDE.md`       | When agent works in `apps/demo/`                  | Vite + DuckDB-Wasm demo conventions                                           |
| `e2e/CLAUDE.md`             | When agent works in `e2e/`                        | E2E test conventions, `ncbiApiKey`, fixture patterns                          |
| `.claude/rules/*.md`        | Always (every turn)                               | Tiny enforced invariants (TS, testing, package layout, commits, review)       |
| `.claude/skills/*`          | On-demand via `/skill-name`                       | Heavy workflows: `/verify`, `/review`, `/release`, `/commit`, `/debug-issue`  |
| `docs/*.md`                 | Linked from above; agent fetches when relevant    | Cross-cutting deep dives, NCBI endpoint catalogue, ADRs                       |
| `README.md`                 | Browsed by humans; not auto-loaded for the agent  | npm-rendered marketing + intro                                                |

**Rule of thumb.** Agent reads CLAUDE.md (auto). Humans read README.
Don't merge the audiences. Per-package CLAUDE.md is the deep reference;
README is the entry/install/quick-start.

---

## Documentation index

Cross-cutting docs in `docs/`. **Linked, not auto-loaded** — fetch when
relevant. Files marked **reference** must be read with `Grep` /
specific-line `Read`, not whole-file loads.

<!-- sync-docs:doc-index:start -->
| Doc                                                          | Topic                                                                                                  | Notes                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`docs/adding-a-package.md`](./docs/adding-a-package.md) | Twelve-step checklist for adding a new package to the monorepo: scaffold, verify against the live A… | small (read whole) |
| [`docs/architecture.md`](./docs/architecture.md) | High-level monorepo design — Nx workspace, ESM-only, zero-dep philosophy, dependency graph, build o… | small (read whole) |
| [`docs/data-pipelines.md`](./docs/data-pipelines.md) | Inventory of bulk-data parsers and the NCBI distributions they ingest — input formats, sample sizes… | **large — read sections** |
| [`docs/ncbi-api-catalog.md`](./docs/ncbi-api-catalog.md) | Exhaustive reference of every NCBI / NLM HTTP endpoint and bulk download URL covered by the ecosyst… | **reference — use grep, not Read** |
| [`docs/package-architecture.md`](./docs/package-architecture.md) | Flat vs split layout decision, required files (README + CLAUDE.md), CLAUDE.md template, @import pol… | small (read whole) |
| [`docs/pipeline-architecture.md`](./docs/pipeline-architecture.md) | Storage strategy, sync engine internals, DuckDB schema, data inventory across the bulk pipeline. Re… | **large — read sections** |
| [`docs/rag-integration.md`](./docs/rag-integration.md) | How ncbijs slots into a RAG pipeline as the data-access layer — chunking, embedding, retrieval, cit… | medium |
| [`docs/release-and-publish.md`](./docs/release-and-publish.md) | Tag-triggered npm publishing with OIDC provenance, per-package CHANGELOG flow, /release skill integ… | small (read whole) |
| [`docs/testing-strategy.md`](./docs/testing-strategy.md) | Vitest conventions — fetch mocking, XML fixtures, 100% coverage policy, restoreMocks. | small (read whole) |
| [`docs/type-safety.md`](./docs/type-safety.md) | Three-layer type pattern (raw / domain / parsed), format-dependent overloads, no-any rationale, why… | small (read whole) |
| [`scripts/ncbi-api-monitor/CLAUDE.md`](./scripts/ncbi-api-monitor/CLAUDE.md) | NCBI API drift detection strategy + script reference; auto-loads when working in that subtree | Read when triaging `/ncbi-check-updates` findings |
| [`docs/adr/`](./docs/adr/) | Architecture decision records | Read when changing architectural decisions |
<!-- sync-docs:doc-index:end -->

---

## Commands

```bash
pnpm build                # Build all packages (topological order via Nx)
pnpm test                 # Test all packages (Vitest with coverage)
pnpm lint                 # Lint all packages (ESLint flat config)
pnpm typecheck            # Type-check all packages

# Single package
pnpm nx run @ncbijs/eutils:build
pnpm nx run @ncbijs/eutils:test
pnpm nx run @ncbijs/eutils:lint
pnpm nx run @ncbijs/eutils:typecheck

# E2E (requires NCBI_API_KEY env var)
pnpm nx run ncbijs-e2e:e2e

# Demo (Vite app at apps/demo/)
cd apps/demo && pnpm dev      # Start dev server at http://localhost:5173
pnpm nx run demo:build        # Production build to apps/demo/dist/
```

## Architecture

- **Monorepo**: Nx 22 + pnpm 10.15 workspaces
- **Language**: TypeScript 6, ES2022 target, `strict: true`
- **Module**: ESM-only (`"type": "module"`), `moduleResolution: "bundler"`, no `.js` in source imports
- **Build**: `tsc` + `tsc-esm-imports` CLI (devDep, linked from `../tsc-esm-imports`) adds `.js` to compiled output
- **Zero-dep philosophy**: Most packages have zero runtime dependencies. `eutils` depends on `rate-limiter` + `openapi-fetch`. `datasets`, `blast`, `snp`, `clinvar`, `pubchem`, `clinical-trials`, `icite`, `rxnorm`, `dailymed`, `litvar`, `bioc`, `cite`, `mesh`, `id-converter`, `pubtator`, `clinical-tables` depend on `rate-limiter`. `pubmed` and `pmc` depend only on internal `@ncbijs/*` packages.
- **`rate-limiter` is project-agnostic**: This package must contain zero NCBI-specific code, zero business logic, and zero coupling to any other `@ncbijs/*` package. It is designed to be extractable into a standalone published library with no changes. Never add domain-specific constants, NCBI URLs, credential helpers, or API-specific retry logic to it. All NCBI-specific infrastructure belongs in the consuming packages (e.g., `*-client.ts` files).

### Package dependency graph

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
                  ├─ pubchem
                  ├─ clinical-trials
                  ├─ icite
                  ├─ rxnorm
                  ├─ dailymed
                  ├─ litvar
                  ├─ bioc
                  ├─ cite
                  ├─ mesh
                  ├─ id-converter
                  └─ clinical-tables
pipeline  (zero-dep, independent)
sync      (zero-dep, independent)
fasta     (zero-dep, independent)
etl ──────────────── pipeline, sync, mesh, clinvar, datasets, pubchem, id-converter
apps/demo (private) ── pubmed, mesh, datasets, clinvar, snp, pubchem, id-converter, etl + @duckdb/duckdb-wasm
```

### Build order (Nx topological)

1. Zero-dep parallel: `rate-limiter`, `xml`, `fasta`, `pipeline`, `sync`
2. `id-converter`, `mesh`, `cite`, `litvar`, `bioc`, `clinical-tables`, `eutils`, `datasets`, `blast`, `snp`, `pubchem`, `pubmed-xml`, `jats`, `pubtator`, `clinvar`, `clinical-trials`, `icite`, `rxnorm`, `dailymed`
3. `pubmed` (after `eutils` + `pubmed-xml`), `pmc` (after `eutils` + `jats` + `rate-limiter`)
4. `etl` (after `pipeline` + `sync` + `mesh` + `clinvar` + `datasets` + `pubchem` + `id-converter`)

### Source-agnostic architecture

Domain packages (mesh, datasets, clinvar, pubchem, id-converter) support two modes:

- **HTTP mode** (default): `new Datasets({ apiKey })` -- queries NCBI servers
- **Storage mode**: `Datasets.fromStorage(storage)` -- queries local/cloud data

The `DataStorage` interface is defined locally in each package (structural typing, no cross-package dependency). `ReadableStorage` from `@ncbijs/store` satisfies it. Pipeline + ETL populate storage; the same packages query it.

### Demo app (`apps/demo/`)

Static Vite app deployed to GitHub Pages with two query modes:

- **NCBI Servers** -- imports browser-safe `@ncbijs/*` packages and queries NCBI HTTP APIs directly from the browser (MeSH, Datasets, ClinVar, PubChem, ID converter)
- **Your Data** -- uses the same `@ncbijs/*` packages with `fromStorage()`, pointed at a DuckDB-Wasm database pre-loaded with NCBI data (no network required)

Key files: `apps/demo/src/app.ts` (mode switcher), `apps/demo/src/live-api.ts` (NCBI API calls), `apps/demo/src/local-api.ts` (storage-backed queries), `apps/demo/src/duckdb-wasm-storage.ts` (browser DataStorage adapter), `apps/demo/src/query-catalog.ts` (example queries). Deployed via `.github/workflows/demo.yml`.

After any demo changes, verify visually: `cd apps/demo && pnpm dev`, open `http://localhost:5173`, test both NCBI Servers and Your Data tabs.

## Rules and Skills

This repo includes `.claude/` configuration that Claude reads automatically:

**Rules** (always loaded, enforce conventions):

- **`.claude/rules/typescript.md`** -- TypeScript coding conventions (naming, types, imports, formatting)
- **`.claude/rules/testing.md`** -- 18 testing rules, spec structure, coverage requirements
- **`.claude/rules/review-criteria.md`** -- Code review evaluation criteria and severity scoring
- **`.claude/rules/package-architecture.md`** -- Package layout conventions (flat vs. split with http/bulk-parsers)
- **`.claude/rules/commits.md`** -- Conventional Commits format with dynamic scope from `packages/` (no runtime enforcement since commitlint was removed)

**Skills** (invoked on demand via `/skill-name`):

- **`.claude/skills/testing/`** -- Test writing templates and patterns
- **`.claude/skills/review/`** -- Code review workflow (references `rules/review-criteria.md`)
- **`.claude/skills/commit/`** -- Composable git workflow: `/commit`, `/commit squash`, `/commit push`, `/commit squash push`
- **`.claude/skills/explore-codebase/`** -- Knowledge graph navigation
- **`.claude/skills/debug-issue/`** -- Systematic debugging
- **`.claude/skills/refactor-safely/`** -- Safe refactoring with dependency analysis
- **`.claude/skills/release/`** -- Thin wrapper around `/solo-npm:release` from the [`gagle/solo-npm`](https://github.com/gagle/solo-npm) marketplace plugin; tag-triggered three-phase release with OIDC provenance; adds monorepo-specific narrative (Nx workspace at `packages/*`, prepare-dist usage, unified versioning)
- **`.claude/skills/verify/`** -- Thin wrapper around `/solo-npm:verify`; runs `pnpm nx run-many -t lint typecheck build test` for the Nx monorepo
- **`.claude/skills/ncbi-check-updates/`** -- NCBI API change monitor (runs `scripts/ncbi-api-monitor/detect.ts` then acts on findings)

Other lifecycle skills are invoked directly without a wrapper (no per-repo customization needed):

- `/solo-npm:trust` — OIDC trust setup wizard
- `/solo-npm:status` — read-only portfolio dashboard across all `@ncbijs/*` packages
- `/solo-npm:audit` — security audit with risk triage
- `/solo-npm:deps` — dep upgrade orchestrator with verify gates
- `/solo-npm:init` — fresh-repo bootstrap (umbrella; not needed for this repo)

See `CONTRIBUTING.md` for the contribution policy.

## Conventions

Canonical rules live in `.claude/rules/*.md` (auto-loaded). Don't duplicate them here.

| Topic                                  | Authoritative source                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| TypeScript style (imports, types, no-`any`) | [`.claude/rules/typescript.md`](./.claude/rules/typescript.md)            |
| Testing (Vitest, coverage, mocks)      | [`.claude/rules/testing.md`](./.claude/rules/testing.md)                      |
| Code review checklist                  | [`.claude/rules/review-criteria.md`](./.claude/rules/review-criteria.md)      |
| Conventional commits + scope discovery | [`.claude/rules/commits.md`](./.claude/rules/commits.md)                      |
| Flat vs split package layout, required files (README + CLAUDE.md) | [`.claude/rules/package-architecture.md`](./.claude/rules/package-architecture.md) + [`docs/package-architecture.md`](./docs/package-architecture.md) |
| Adding a new package (checklist)       | [`docs/adding-a-package.md`](./docs/adding-a-package.md)                      |

**Workspace-only conventions (not covered by rules):**

- Prettier: 100 width, single quotes, trailing commas, 2-space indent, LF.
- Commit scopes: package directory names under `packages/` (auto-discoverable via `ls packages/`), or `workspace` for repo-wide changes.
- Required files per package: `package.json`, `project.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `eslint.config.mjs`, plus `README.md` (humans) **and `CLAUDE.md` (agents)** — both required.

## Verification

After ANY code change, run `/verify` before marking work complete. This runs all quality gates: lint, build, typecheck, unit tests, e2e tests, and demo build.

### Self-review loop

After implementation is complete, run the following skills in sequence. Loop until both produce no issues or improvements:

1. `/review` -- full review (graph structural analysis + project-specific criteria + five-axis enrichment)
2. `/agent-skills:code-simplify` -- simplify code for clarity without changing behavior

If either skill finds issues, fix them, re-run `pnpm lint && pnpm build && pnpm typecheck && pnpm test`, then repeat the loop.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore the codebase.** The graph is faster, cheaper (fewer tokens), and gives you structural context (callers, dependents, test coverage) that file scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes -- gives risk-scored analysis   |
| `get_review_context`        | Need source snippets for review -- token-efficient     |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Graph updates

The graph auto-updates via PostToolUse hooks after Edit/Write/Bash operations. However, git operations that bring in external changes (rebase, pull, merge) bypass these hooks. After such operations, update the graph manually:

```
mcp__code-review-graph__build_or_update_graph_tool
```
