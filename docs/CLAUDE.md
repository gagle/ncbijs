---
context: 'docs'
purpose: 'Cross-cutting architectural and process documentation. Auto-loaded when editing docs; otherwise linked from CLAUDE.md.'
last_audited: '2026-02-11'
---

# docs — cross-cutting documentation

Auto-loaded when working in `docs/`. The root [`CLAUDE.md`](../CLAUDE.md)
has the same index in condensed form for the always-loaded path.

## What lives here

Cross-cutting content only. **Per-package deep references live at
`packages/<x>/CLAUDE.md`** — co-located with the code. **Per-script
deep references live at `scripts/<x>/CLAUDE.md`**. Don't add
package- or script-specific content here.

## File index

| File                          | Topic                                                                                          | Size                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| `architecture.md`             | Monorepo structure, ESM-only rationale, zero-dep philosophy                                    | small (read whole)                |
| `package-architecture.md`     | Flat vs split layout decision; required files (README + CLAUDE.md)                             | small                             |
| `adding-a-package.md`         | New-package checklist (use `pnpm scaffold-package <name>` once it ships)                       | small                             |
| `pipeline-architecture.md`    | Storage strategy, sync engine, DuckDB schema, data inventory                                   | **~1K lines — read sections**     |
| `data-pipelines.md`           | User-guide for Source → Parse → Sink composition                                               | small                             |
| `rag-integration.md`          | RAG chunking, embedding, retrieval workflow walkthrough                                        | medium                            |
| `ncbi-api-catalog.md`         | **Reference: every NCBI API endpoint and parameter shape**                                     | **31 KB — use grep, not Read**    |
| `testing-strategy.md`         | Vitest conventions, 100% coverage, fixture patterns                                            | small                             |
| `type-safety.md`              | TypeScript strict-mode rules and rationale                                                     | small                             |
| `release-and-publish.md`      | Tag-triggered npm release with OIDC provenance                                                 | small                             |
| `adr/`                        | Architecture decision records                                                                  | one file per ADR                  |

## Consumption guidance for big files

- **`ncbi-api-catalog.md`** — 31 KB. **Never `Read` the whole file.**
  Use `Grep pattern="<endpoint-name>" path="docs/ncbi-api-catalog.md"`
  or `Read offset/limit` for specific section ranges. This file is
  reference material, not a tutorial.
- **`pipeline-architecture.md`** — ~1K lines. Read by section heading.
  Common entry points: "Storage strategy", "Sync engine", "DuckDB
  schema".

## Doc-writing conventions

- One `H1` per file (`# Title`). Subsequent sections use `##`/`###`.
- Code blocks fenced with the language tag (`````ts`, `````bash`).
- Cross-links use relative paths from the file's location.
- No emojis unless explicitly requested.
- No comments inside code samples unless explaining a non-obvious invariant.
- Front-load the why; technical detail follows.
- For new ADRs: place under `adr/` with format `NNNN-topic.md`
  (zero-padded sequence). Each ADR has Context / Decision /
  Consequences sections.

## When to add a new file here vs a per-package or per-script CLAUDE.md

| Topic spans …                                                  | Goes in                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| Multiple packages or the workspace as a whole                  | `docs/<topic>.md`                                        |
| One package's API, types, pitfalls, wiring                     | `packages/<x>/CLAUDE.md`                                 |
| One package's human-facing intro, install, quickstart          | `packages/<x>/README.md`                                 |
| One script's strategy, internals, pitfalls                     | `scripts/<x>/CLAUDE.md`                                  |
| A historical decision the team needs to remember               | `docs/adr/NNNN-<topic>.md`                               |
| Build/release process                                          | `docs/release-and-publish.md`                            |
| External-system reference (NCBI, npm, Nx, etc.)                | `docs/<system>-catalog.md` or topic-specific             |

## Common pitfalls

1. **Adding package-specific content here.** If a topic is about one
   package or one script, it belongs in that subtree's `CLAUDE.md`.
   The two should not drift; the co-located file is canonical.
2. **Loading the API catalog whole.** `ncbi-api-catalog.md` is
   reference material; reading it whole burns ~10K tokens.
3. **ADRs without consequences.** An ADR that only documents a
   decision without its Consequences section is incomplete. Future
   contributors can't tell when the decision should be revisited.
