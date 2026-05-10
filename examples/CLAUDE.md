---
context: 'examples'
purpose: 'Runnable single-file TypeScript demos of every published package. Each example is self-contained and copy-pasteable.'
runtime: 'Node.js (tsx)'
last_audited: '2026-02-15'
---

# examples — runnable demos

Auto-loaded when working in `examples/`.

## Purpose

One short script per package per common workflow. Each example is:

- **Self-contained** — runs with `pnpm exec tsx examples/<file>.ts`.
- **Copy-pasteable** — a developer can paste it into their own project with minimal edits.
- **Tied to one (or two) packages** — not a tutorial of the whole ecosystem.

The catalogue is in [`README.md`](./README.md). When you add or rename an example, update the table there.

## Naming convention

`<package-or-feature>-<verb>.ts`. Examples:

- `search-pubmed.ts` — verb-led when the package name is implied
- `convert-ids.ts`, `fasta-parse.ts`, `rag-chunking.ts`
- `clinical-trials-search.ts` — package-prefixed when the package name is part of the topic
- `annotate-entities.ts` (PubTator), `cite-formats.ts` (Cite)

Keep names lowercase, hyphenated, and short. No camelCase.

## Anatomy of a good example

```ts
// One-line comment header explaining what the example does and which package it shows.
import { EUtils } from '@ncbijs/eutils';

const eutils = new EUtils({
  tool: 'ncbijs-examples',
  email: 'you@example.com',
  apiKey: process.env['NCBI_API_KEY'],
});

const result = await eutils.esearch({ db: 'pubmed', term: 'CRISPR', retmax: 5 });
console.log(`Found ${result.count} results`);
console.log(result.idList);
```

Rules:

- One H1-level comment at the top — purpose + package.
- Read `NCBI_API_KEY` from env (optional, raises rate limits).
- `tool` should be `'ncbijs-examples'` for consistency.
- Print results with `console.log` — examples run in a terminal.
- Keep under ~80 lines. If a workflow needs more, split into a sub-directory (see `data-pipeline/`).

## When to add a new example

1. New public API method on a package → ship an example showing it.
2. New common workflow that spans 2+ packages (search-then-fetch, RAG ingest, etc.).
3. Missing example for an existing package — `pnpm check-claude-md examples` flags these.

When you add: also append a row to `README.md`'s catalogue table.

## Common pitfalls

1. **Hardcoding an API key.** Never check in keys. Always read `process.env['NCBI_API_KEY']`.
2. **Adding npm-package metadata here.** This directory is not a published package — package install instructions belong in the package's README, not here.
3. **Examples that aren't actually runnable.** `pnpm exec tsx examples/<file>.ts` must work. If a build step is needed, the example is too complex — simplify or move to docs.
4. **Multi-package tutorials.** This directory is for *single-shot* demos. Multi-step architectures (RAG end-to-end, ETL pipelines) belong in `docs/`, not as one giant example.

## Cross-references

- [`README.md`](./README.md) — human-facing catalogue.
- Per-package CLAUDE.md (`packages/<x>/CLAUDE.md`) for the API surface each example exercises.
- [`docs/rag-integration.md`](../docs/rag-integration.md) for the RAG architecture walkthrough that examples shorthand.
