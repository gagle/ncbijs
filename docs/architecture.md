# Architecture Guide

## Monorepo Structure

```
ncbijs/
├── packages/
│   ├── xml/               Zero-dep, shared regex-based XML reader
│   ├── rate-limiter/      Zero-dep, token bucket rate limiter
│   ├── fasta/             Zero-dep, FASTA sequence parser
│   ├── eutils/            E-utilities HTTP client (depends on rate-limiter)
│   ├── pubmed-xml/        PubMed XML/MEDLINE parser (depends on xml)
│   ├── jats/              JATS XML full-text parser (depends on xml)
│   ├── pubmed/            PubMed search + fetch (depends on eutils + pubmed-xml)
│   ├── pmc/               PMC full-text (depends on eutils + jats + rate-limiter)
│   ├── id-converter/      PMID/PMCID/DOI converter + bulk CSV parser
│   ├── pubtator/          PubTator3 text mining (depends on rate-limiter)
│   ├── mesh/              MeSH vocabulary + bulk XML parser
│   ├── cite/              Citation formatting + bulk formatter
│   ├── datasets/          NCBI Datasets API + bulk gene/taxonomy parsers
│   ├── blast/             BLAST sequence alignment
│   ├── snp/               dbSNP variant lookup + bulk JSON parser
│   ├── clinvar/           ClinVar clinical variants + bulk TSV parser
│   ├── pubchem/           PubChem compounds + bulk extras parser
│   ├── clinical-trials/   ClinicalTrials.gov
│   ├── icite/             NIH iCite citation metrics
│   ├── rxnorm/            RxNorm drug normalization
│   ├── litvar/            LitVar variant-literature linking
│   ├── bioc/              BioC annotated text
│   ├── clinical-tables/   Clinical Table Search (ICD-10, LOINC, SNOMED)
│   ├── genbank/           GenBank sequence records
│   ├── nucleotide/        NCBI Nucleotide database
│   ├── protein/           NCBI Protein database
│   ├── omim/              OMIM genetic disorders
│   ├── medgen/            MedGen medical genetics
│   ├── gtr/               Genetic Testing Registry
│   ├── geo/               Gene Expression Omnibus
│   ├── dbvar/             dbVar structural variants
│   ├── sra/               Sequence Read Archive
│   ├── structure/         MMDB 3D structures
│   ├── cdd/               Conserved Domain Database
│   ├── books/             NCBI Bookshelf
│   ├── nlm-catalog/       NLM Catalog
│   └── http-mcp/          MCP server for live API queries
├── e2e/                   Integration tests against real NCBI APIs
├── examples/              Runnable TypeScript examples
├── docs/                  Technical guides
├── scripts/               Build and utility scripts
└── .github/workflows/     CI + Release
```

## Package Layouts

Packages use one of two layouts. See [Package Architecture](./package-architecture.md) for full details.

**Flat layout** (HTTP client only): `{name}.ts`, `{name}-client.ts`, `interfaces/`

**Split layout** (HTTP + bulk parsers): `http/`, `bulk-parsers/`, `interfaces/`

Split packages: `mesh`, `snp`, `pubchem`, `clinvar`, `cite`, `id-converter`, `datasets`, `icite`, `clinical-trials`, `litvar`, `medgen`, `cdd`, `pmc`.

## Toolchain

- **Monorepo:** Nx 22 + pnpm 10.15 workspaces
- **Language:** TypeScript 6, ES2022 target, strict mode
- **Module:** ESM-only (`"type": "module"`), `.js` extensions in imports
- **Build:** `tsc` directly (no bundler)
- **Test:** Vitest 4 with v8 coverage, per-package configs
- **Lint:** ESLint 10 flat config with Nx plugin
- **Format:** Prettier (100 width, single quotes, trailing commas)
- **Git:** Husky + commitlint (conventional commits)
- **Release:** `/release` skill (linked versioning, tag-triggered publish)
- **Publish:** From `dist/` via `gagle/prepare-dist`, npm provenance
- **CI:** GitHub Actions, Node 20/22/24 matrix

## ESM-Only Rationale

All packages are ESM-only because:

- Browser `fetch` is native (no polyfill)
- Node 18+ has native `fetch` and ESM support
- `ReadableStream` (Web Streams API) works in both environments
- No `node:fs`, `node:buffer`, or any `node:` modules used
- Single build target, no dual CJS/ESM builds

## Build Ordering

Nx `dependsOn: ["^build"]` in `nx.json` handles topological ordering:

1. Zero-dep parallel: `rate-limiter`, `xml`, `fasta`
2. Internal deps: `eutils`, `pubmed-xml`, `jats`, `pubtator`, and all rate-limiter consumers
3. Composite: `pubmed` (eutils + pubmed-xml), `pmc` (eutils + jats + rate-limiter)

## Zero-Dep Philosophy

No external runtime dependencies except `openapi-fetch` in `eutils`. All other dependencies are internal `@ncbijs/*` packages.

- HTTP: native `fetch`
- Streaming: `ReadableStream` / `AsyncIterableIterator`
- XML parsing: `@ncbijs/xml` (shared regex-based reader)
- Rate limiting: `@ncbijs/rate-limiter` (token bucket)
- Retry: custom exponential backoff

## Path Resolution Strategy

- `tsconfig.base.json` has `paths` entries for all packages -- enables IDE and typecheck
- `tsc` does NOT rewrite path aliases in emitted JS
- At runtime, `@ncbijs/*` resolves via pnpm workspace symlinks (dev) or npm (production)
- At publish time, `workspace:*` is replaced with real version numbers by pnpm

## Package.json Conventions

- `"type": "module"` on every package
- `exports` map only (no `main`/`types` fields)
- `publishConfig: { access: "public", provenance: true }`
- `engines: { node: ">=18" }`
- `files: ["dist", "package.json", "README.md", "LICENSE", "CHANGELOG.md"]`
- `prepublishOnly` guard prevents accidental local publish
- `sideEffects: false` for tree-shaking
