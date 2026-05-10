---
package: '@ncbijs/store-mcp'
purpose: 'Model Context Protocol server exposing locally stored NCBI data (DuckDB-backed) as LLM-callable tools. Stdio transport. Sibling of @ncbijs/http-mcp; queries pre-loaded data instead of live NCBI APIs.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@modelcontextprotocol/sdk'
  - '@ncbijs/store'
  - 'zod'
used_by: []
exports: []
related_docs:
  - 'docs/rag-integration.md'
  - 'docs/data-pipelines.md'
last_audited: '2026-04-29'
---

# @ncbijs/store-mcp

## Purpose

A Model Context Protocol (MCP) server that exposes a DuckDB-backed
`ReadableStorage` (from `@ncbijs/store`) as LLM-callable tools. Stdio
transport; one process per MCP session.

Sibling of `@ncbijs/http-mcp`. Where `http-mcp` sends every call out
to NCBI servers, `store-mcp` answers from a local DuckDB file populated
ahead of time by `@ncbijs/etl`. No NCBI API key, no rate limits, no
network — at the cost of staleness.

The package is an **executable**, not a library. It has no public JS
API; the entry at `dist/index.js` runs the server.

## When to use

- An MCP-compatible agent (Claude Code, Claude Desktop, Continue)
  needs to query NCBI data offline or under heavy load.
- A privacy-sensitive deployment where every query going to NCBI is
  unacceptable.
- A workflow where data freshness on the order of "last full ETL run"
  is good enough — `@ncbijs/sync` + `@ncbijs/etl` keep it current.
- Development and testing of agent prompts without burning real API
  quota.

## When NOT to use

| Goal                                                       | Use instead                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Live NCBI API access for an LLM agent                      | `@ncbijs/http-mcp`                                                  |
| Direct programmatic queries from your own Node code        | `@ncbijs/store` + the relevant domain package's `fromStorage(...)`  |
| Loading data into the DuckDB file                          | `@ncbijs/etl` (`load`, `loadAll`)                                   |
| Polling NCBI for upstream changes                          | `@ncbijs/sync` + `@ncbijs/etl`'s `createCheckers()`                 |
| Adding a new dataset's MCP tools                           | Edit `src/tools/*-tools.ts` + `src/register-tools.ts` (this package) |
| HTTP-streaming MCP transport                               | This package is stdio-only; would need a fork                       |

## Exports

This package is an **executable**, not a library. The published
package exposes only a `bin`:

```bash
npx @ncbijs/store-mcp
```

Wire into Claude Code via `.mcp.json`:

```json
{
  "mcpServers": {
    "ncbijs-store": {
      "command": "npx",
      "args": ["-y", "@ncbijs/store-mcp"],
      "env": {
        "NCBIJS_DB_PATH": "/path/to/ncbijs.duckdb"
      }
    }
  }
}
```

The only `exports` entry is `./package.json` — there is no JS public
API to import.

## API surface

### Tools registered

Each domain has one lookup-by-id tool and one search tool, plus a
single global stats tool. All are prefixed `store-` to disambiguate
from `@ncbijs/http-mcp`'s tools.

| Tool                       | Source file                | Storage call                                          |
| -------------------------- | -------------------------- | ----------------------------------------------------- |
| `store-lookup-mesh`        | `tools/mesh-tools.ts`      | `getRecord('mesh', id)`                               |
| `store-search-mesh`        | `tools/mesh-tools.ts`      | `searchRecords('mesh', { field: 'name', ... })`       |
| `store-lookup-variant`     | `tools/clinvar-tools.ts`   | `getRecord('clinvar', uid)`                           |
| `store-search-variants`    | `tools/clinvar-tools.ts`   | `searchRecords('clinvar', { field, ... })`            |
| `store-lookup-gene`        | `tools/gene-tools.ts`      | `getRecord('genes', id)`                              |
| `store-search-genes`       | `tools/gene-tools.ts`      | `searchRecords('genes', { field, ... })`              |
| `store-lookup-taxonomy`    | `tools/taxonomy-tools.ts`  | `getRecord('taxonomy', taxId)`                        |
| `store-search-taxonomy`    | `tools/taxonomy-tools.ts`  | `searchRecords('taxonomy', { field, ... })`           |
| `store-lookup-compound`    | `tools/compound-tools.ts`  | `getRecord('compounds', cid)`                         |
| `store-search-compounds`   | `tools/compound-tools.ts`  | `searchRecords('compounds', { field, ... })`          |
| `store-convert-ids`        | `tools/id-mapping-tools.ts`| ID mapping lookup against `id-mappings`               |
| `store-search-ids`         | `tools/id-mapping-tools.ts`| `searchRecords('id-mappings', { field, ... })`        |
| `store-stats`              | `tools/stats-tools.ts`     | `getStats()`                                          |

Search tools accept a uniform `{ field, value, operator, limit }`
shape where `operator ∈ 'eq' | 'starts_with' | 'contains'` and
`limit` defaults to 20. Schemas are declared with `zod` and
auto-converted to JSON Schema by `@modelcontextprotocol/sdk`.

### Architecture

- **`src/index.ts`** — bootstrap: reads `NCBIJS_DB_PATH`, opens
  `DuckDbFileStorage`, registers tools via a `getStorage` accessor,
  connects `StdioServerTransport`. Storage is opened **before**
  `server.connect()` so the first tool call doesn't pay async open
  latency.
- **`src/register-tools.ts`** — central registration. Calls each
  `register*Tools(server, getStorage)` in turn.
- **`src/tools/<domain>-tools.ts`** — one file per domain (mesh,
  clinvar, gene, taxonomy, compound, id-mapping, stats). Each
  registers two tools (lookup + search) except `stats-tools.ts`
  which registers one.

The `getStorage` accessor is a closure over the module-level `storage`
binding. It throws if called before `DuckDbFileStorage.open` has
resolved — defensive, but with current bootstrap ordering this should
never happen in practice.

## Configuration

Reads from `process.env`:

| Env var          | Purpose                                                  | Default                                       |
| ---------------- | -------------------------------------------------------- | --------------------------------------------- |
| `NCBIJS_DB_PATH` | Absolute or relative path to the DuckDB file             | `<cwd>/data/ncbijs.duckdb`                    |

The path is resolved with `node:path/join` against `process.cwd()` if
relative. There is no NCBI API key, tool, or email — this server
never talks to NCBI.

## Cross-package wiring

- **Depends on `@ncbijs/store`** for `DuckDbFileStorage` and the
  `ReadableStorage` interface. Every tool calls `getRecord`,
  `searchRecords`, or `getStats` on that interface — no direct DuckDB
  SQL is written here.
- **Depends on `@modelcontextprotocol/sdk`** for `McpServer`,
  `StdioServerTransport`, and tool registration.
- **Depends on `zod`** for input schemas.
- **Pairs with `@ncbijs/etl`** — that package writes the DuckDB file
  this server reads. Dataset ids must match exactly:
  `'mesh' | 'clinvar' | 'genes' | 'taxonomy' | 'compounds' | 'id-mappings'`.
- **Pairs with `@ncbijs/http-mcp`** — both expose NCBI data over MCP.
  Run them side by side in `.mcp.json` to give the agent a choice
  between live and local sources.
- **Does NOT depend on any domain package** (mesh, clinvar, etc.).
  Records are returned as opaque `Record<string, unknown>` shaped by
  whatever the ETL parsers wrote into DuckDB. Schema drift between
  parser output and tool consumers is a real risk — see Common
  pitfalls.

## Common pitfalls

1. **DB file missing or empty.** `DuckDbFileStorage.open` will succeed
   on a non-existent path (DuckDB creates an empty file). The first
   `getRecord` then returns `undefined` and the LLM sees "not found in
   store" for every query. Always run an ETL pass before pointing the
   server at a fresh path.

2. **Dataset id mismatch with ETL.** Tools hard-code dataset ids as
   string literals (`'mesh'`, `'clinvar'`, `'genes'`, `'taxonomy'`,
   `'compounds'`, `'id-mappings'`). Renaming a dataset in
   `@ncbijs/etl` without updating these strings produces silent
   "not found" responses. There is no compile-time check across the
   two packages.

3. **`storage` is a module-level mutable.** A single MCP session uses
   one process and one storage handle. Multiple sessions need
   multiple processes — do not try to share the bin across stdio
   transports.

4. **Search responses can be large.** `searchRecords` limit defaults
   to 20 but a `'contains'` search across compounds can still return
   sizeable JSON. The whole result is `JSON.stringify(records, null, 2)`
   in a single text content block — stdio carries it but some MCP
   clients buffer the entire message before parsing. Tune `limit`
   downward if you see latency.

5. **Zod schema vs JSON Schema gotchas.** The MCP SDK consumes Zod
   schemas, not raw JSON Schema. Adding a new tool with a hand-written
   JSON Schema will silently fail validation. Stick to `z.object` /
   `z.string` / `z.enum` patterns from the existing tool files.

6. **Adding a tool without updating `instructions`.** The
   server-level `instructions` string in `index.ts` is the LLM's
   first-pass orientation. New tools that aren't mentioned there are
   still discoverable but harder for the LLM to find. Update the
   prose when adding a domain.

7. **`bin` field in `package.json` requires the shebang.**
   `src/index.ts` starts with `#!/usr/bin/env node`. Don't strip it
   during refactors — the published binary needs it on POSIX.

8. **Server version drift.** `SERVER_VERSION` in `index.ts` is
   hard-coded `'0.0.1'` but the package version is managed in
   `package.json`. They are intentionally independent (server
   protocol version vs npm package version) but auditors may flag the
   mismatch — leave both alone unless you understand which one a
   given consumer reads.

## Testing

```bash
pnpm nx run @ncbijs/store-mcp:test
pnpm nx run @ncbijs/store-mcp:typecheck
pnpm nx run @ncbijs/store-mcp:build

# Manual: run the server stdio-style and pipe MCP commands
NCBIJS_DB_PATH=./data/ncbijs.duckdb npx tsx packages/store-mcp/src/index.ts
```

Unit tests in `src/register-tools.spec.ts` and each
`src/tools/*-tools.spec.ts` exercise registration shape and tool
handlers against a fake `ReadableStorage`. 100 % coverage is required.

End-to-end MCP transport coverage is exercised through the consuming
agent's MCP integration (Claude Code, etc.), not in this repo.

## Files

```
packages/store-mcp/src/
  index.ts                       # bootstrap: env, storage, server, transport
  register-tools.ts              # central registration
  register-tools.spec.ts
  tools/
    mesh-tools.ts                # store-lookup-mesh, store-search-mesh
    mesh-tools.spec.ts
    clinvar-tools.ts             # store-lookup-variant, store-search-variants
    clinvar-tools.spec.ts
    gene-tools.ts                # store-lookup-gene, store-search-genes
    gene-tools.spec.ts
    taxonomy-tools.ts            # store-lookup-taxonomy, store-search-taxonomy
    taxonomy-tools.spec.ts
    compound-tools.ts            # store-lookup-compound, store-search-compounds
    compound-tools.spec.ts
    id-mapping-tools.ts          # store-convert-ids, store-search-ids
    id-mapping-tools.spec.ts
    stats-tools.ts               # store-stats
    stats-tools.spec.ts
```
