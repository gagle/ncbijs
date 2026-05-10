---
context: 'apps/demo'
purpose: 'Vite + DuckDB-Wasm static demo deployed to GitHub Pages. Two query modes (NCBI HTTP servers vs local DuckDB) sharing the same @ncbijs/* domain APIs.'
deployment: '.github/workflows/demo.yml'
runtime: 'Browser (Vite + DuckDB-Wasm)'
last_audited: '2026-02-09'
---

# apps/demo — Vite + DuckDB-Wasm static demo

Auto-loaded when working in `apps/demo/`.

## Purpose

A static frontend that demonstrates `@ncbijs/*` packages running in a
browser, with two interchangeable query modes:

1. **NCBI Servers** — uses each domain package's HTTP API directly
   from the browser. Shows that 40 of 43 packages are browser-safe
   (no Node-only deps).
2. **Your Data** — same packages with `fromStorage()`, pointed at a
   DuckDB-Wasm database pre-loaded with NCBI bulk distributions. No
   network. No rate limits. Demonstrates the "data pipelines" story.

Deployed to GitHub Pages on every push to `main` via
[`.github/workflows/demo.yml`](../../.github/workflows/demo.yml).

## Key files

| File                         | Role                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `src/app.ts`                 | Entry point + mode switcher between live and local APIs           |
| `src/live-api.ts`            | NCBI HTTP API queries (live mode)                                 |
| `src/local-api.ts`           | Storage-backed queries (`fromStorage()` mode)                     |
| `src/duckdb-wasm-storage.ts` | Browser `DataStorage` adapter over DuckDB-Wasm                    |
| `src/query-catalog.ts`       | Pre-built example queries shown in the UI                         |
| `src/render-table.ts`        | Generic table rendering for query results                         |
| `src/flatten-record.ts`      | Helper: flatten nested NCBI records into table rows               |
| `src/bulk-parsers/`          | Browser-friendly wrappers for `@ncbijs/*` bulk parsers            |
| `src/pipeline/`              | In-browser ETL using `@ncbijs/pipeline`                           |
| `src/storage/`               | DuckDB-Wasm initialization and schema bootstrap                   |
| `index.html`                 | Static HTML shell with mode-toggle UI                             |
| `styles.css`                 | All styles (no framework, hand-written)                           |

## Conventions

- **Browser-only.** No Node-specific imports (`fs`, `path`, etc.).
- **Single-file modules.** Each `*.ts` is small and focused. No deep
  directory trees.
- **Copy-pasteable examples.** `query-catalog.ts` doubles as
  documentation. When adding a new query, write it as if a developer
  is going to copy it into their own app.
- **Mode parity.** Anything in `live-api.ts` should have an
  equivalent in `local-api.ts` if it makes sense to run offline.
- **No build-time NCBI fetches.** All NCBI data flows at runtime.

## Running locally

```bash
cd apps/demo && pnpm dev          # http://localhost:5173
pnpm nx run demo:build            # production build to apps/demo/dist/
pnpm nx run demo:preview          # preview production build
```

After ANY change, **verify visually in the browser**: open
`http://localhost:5173`, test both modes, check the dev console for
errors.

## Common pitfalls

1. **Adding a Node-only `@ncbijs/*` package.** `pipeline`, `etl`,
   `sync`, and `store` (Node DuckDB) are not browser-safe. Use the
   browser-safe domain packages or DuckDB-Wasm bindings instead.
2. **DuckDB-Wasm initialization race.** The first query after page
   load can fire before the WASM module finishes loading. The
   `storage/` bootstrap should always be `await`-ed before issuing
   queries.
3. **Storage mode without a populated DB.** `Your Data` mode assumes
   the DuckDB file is pre-loaded with NCBI data. There's no in-app
   ETL — the data is shipped as part of the deployment artifact.
   Re-run the loader script if data is stale.
