# Architecture

## Monorepo Structure

```
ncbijs/
├── packages/
│   ├── xml/             Zero-dep, shared regex-based XML reader
│   ├── rate-limiter/    Zero-dep, token bucket rate limiter
│   ├── eutils/          E-utilities HTTP client (depends on rate-limiter, xml)
│   ├── pubmed-xml/      PubMed XML/MEDLINE parser (depends on xml)
│   ├── pubmed/          Depends on eutils + pubmed-xml
│   ├── jats/            JATS XML full-text parser (depends on xml)
│   ├── pmc/             Depends on eutils + jats + xml
│   ├── id-converter/    Zero-dep, PMID/PMCID/DOI converter
│   ├── pubtator/        Text mining + BioC (depends on xml)
│   ├── mesh/            Zero-dep, ships ~2MB MeSH tree
│   └── cite/            Zero-dep, citation formatting
├── e2e/                 Integration tests against real NCBI APIs
├── docs/                LLM reference (temporary)
└── .github/workflows/   CI + Release
```

## Toolchain

- **Monorepo:** Nx 22 + pnpm 10.15 workspaces
- **Language:** TypeScript 6, ES2022 target, strict mode
- **Module:** ESM-only (`"type": "module"`), `.js` extensions in imports
- **Build:** `tsc` directly (no bundler)
- **Test:** Vitest 4 with v8 coverage, per-package configs
- **Lint:** ESLint 10 flat config with Nx plugin
- **Format:** Prettier (100 width, single quotes, trailing commas)
- **Git:** Husky + commitlint (conventional commits)
- **Release:** release-please (separate PRs, independent versioning)
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

1. `rate-limiter`, `xml`, `id-converter`, `mesh`, `cite` (parallel, zero-dep)
2. `eutils` (after rate-limiter + xml), `pubmed-xml` (after xml), `jats` (after xml), `pubtator` (after xml)
3. `pubmed` (after eutils + pubmed-xml), `pmc` (after eutils + jats)

## Zero-Dep Philosophy

No external runtime dependencies except `openapi-fetch` in `eutils`. All other dependencies are internal `@ncbijs/*` packages. 5 packages (`xml`, `rate-limiter`, `id-converter`, `mesh`, `cite`) have zero dependencies.

- HTTP: native `fetch`
- Streaming: `ReadableStream` / `AsyncIterableIterator`
- XML parsing: `@ncbijs/xml` (shared regex-based reader)
- Rate limiting: `@ncbijs/rate-limiter` (token bucket)
- Retry: custom exponential backoff

## Path Resolution Strategy

- `tsconfig.base.json` has `paths` entries for all 10 packages → enables IDE and typecheck
- `tsc` does NOT rewrite path aliases in emitted JS
- At runtime, `@ncbijs/eutils` resolves via pnpm workspace symlinks (dev) or npm (production)
- At publish time, `workspace:*` is replaced with real version numbers by pnpm

## Package.json Conventions

- `"type": "module"` on every package
- `exports` map only (no `main`/`types` fields)
- `publishConfig: { access: "public", provenance: true }`
- `engines: { node: ">=18" }`
- `files: ["dist", "package.json", "README.md", "LICENSE", "CHANGELOG.md"]`
- `prepublishOnly` guard prevents accidental local publish
- `sideEffects: false` for tree-shaking
