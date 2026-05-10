---
package: '@ncbijs/http-mcp'
purpose: 'Model Context Protocol server exposing ncbijs domain packages as LLM-callable tools. Stdio transport, lazy-instantiated clients, NCBI credentials from env.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@modelcontextprotocol/sdk'
  - '@ncbijs/blast'
  - '@ncbijs/cite'
  - '@ncbijs/clinvar'
  - '@ncbijs/datasets'
  - '@ncbijs/icite'
  - '@ncbijs/id-converter'
  - '@ncbijs/litvar'
  - '@ncbijs/mesh'
  - '@ncbijs/pmc'
  - '@ncbijs/pubchem'
  - '@ncbijs/pubmed'
  - '@ncbijs/pubtator'
  - '@ncbijs/rxnorm'
  - '@ncbijs/snp'
used_by: []
exports: []
related_docs:
  - 'docs/rag-integration.md'
last_audited: '2026-03-20'
---

# @ncbijs/http-mcp

## Purpose

A Model Context Protocol (MCP) server that exposes ncbijs's NCBI HTTP
clients as tools any MCP-compatible LLM agent (Claude Code, Claude
Desktop, Continue, etc.) can call directly. Stdio transport;
process-per-session.

The agent never reads ncbijs source code — it discovers tools via the
MCP capabilities response and calls them with structured arguments.
This package is the **integration boundary** between ncbijs and
downstream agents.

## When to use

- Configuring Claude Desktop / Claude Code to query NCBI APIs without
  custom code.
- Building an RAG agent that needs structured access to PubMed, PMC,
  PubChem, ClinVar, dbSNP, etc.
- Exposing NCBI data to a coding-agent workflow (the agent searches
  literature while writing code).

## When NOT to use

| Goal                                                       | Use instead                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| Direct programmatic access from your own Node/browser code | Each `@ncbijs/*` package's class API                           |
| Query data already loaded into local DuckDB                | `@ncbijs/store-mcp`                                            |
| Add a new domain package's tools to the MCP server         | Edit `src/register-tools.ts` (this package) — see below        |
| Run an HTTP-streaming MCP transport                        | This package is stdio-only; would need a fork                  |

## Exports

This package is an **executable**, not a library. It has no public
JS API; the entry point at `dist/index.js` is invoked directly:

```bash
npx @ncbijs/http-mcp
```

Or wired into Claude Code via `.mcp.json`:

```json
{
  "mcpServers": {
    "ncbijs": {
      "command": "npx",
      "args": ["tsx", "packages/http-mcp/src/index.ts"],
      "env": {
        "NCBI_TOOL": "my-app",
        "NCBI_EMAIL": "you@example.com",
        "NCBI_API_KEY": "..."
      }
    }
  }
}
```

## Architecture

- **`src/index.ts`** — bootstrap: reads env, creates lazy factories
  for each domain client, instantiates `McpServer`, calls
  `registerAllTools(server, factories)`, connects stdio transport.
- **`src/register-tools.ts`** — central registration. Imports all tool
  modules and binds each to its factory.
- **`src/tools/<domain>/*.ts`** — one tool module per domain function
  (`pubmed/search.ts`, `pmc/get-full-text.ts`, etc.). Each defines:
  - tool name (kebab-case, e.g. `search-pubmed`)
  - description (LLM reads this to decide when to call)
  - input schema (JSON Schema for arguments)
  - handler (async function that calls the domain client)

**Lazy instantiation** is critical: the MCP server has many tools but
a session typically uses 2-5. Constructing every domain client at
startup wastes process time and memory. Each `getX()` factory
instantiates on first use.

## Domain coverage

Currently exposes tools for:

- `@ncbijs/pubmed` — search, fetch articles, history workflows
- `@ncbijs/pmc` — full-text retrieval, OAI-PMH listing
- `@ncbijs/datasets` — gene, genome, taxonomy lookup
- `@ncbijs/blast` — submit / poll / retrieve sequence alignment
- `@ncbijs/snp` — variant lookup, HGVS/SPDI/VCF conversion
- `@ncbijs/clinvar` — clinical variant significance
- `@ncbijs/pubchem` — compound properties, annotations
- `@ncbijs/icite` — citation metrics
- `@ncbijs/rxnorm` — drug normalization

**Not yet exposed** (could be added — see "Adding a tool" below):
mesh, cite, id-converter, pubtator, jats, pubmed-xml, clinical-trials,
clinical-tables, dailymed, litvar, bioc, etl/pipeline, fasta, genbank,
omim, medgen, gtr, geo, dbvar, sra, structure, cdd, books, nlm-catalog,
nucleotide, protein.

## Configuration

Reads from `process.env`:

| Env var          | Purpose                                                            | Default                                       |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `NCBI_TOOL`      | NCBI usage-policy `tool` field                                     | `'ncbijs-mcp'`                                |
| `NCBI_EMAIL`     | NCBI usage-policy `email` field                                    | `'ncbijs-mcp@users.noreply.github.com'`       |
| `NCBI_API_KEY`   | Optional; raises rate from 3 → 10 req/s on supported endpoints     | undefined                                     |

These are passed to each domain client at construction time.

## Cross-package wiring

This package is the **convergence point** of the ecosystem — it
imports many `@ncbijs/*` packages. As a result it is the heaviest
package in the dependency graph and has no internal consumers.

Adding a new domain package's tools requires:

1. `pnpm add @ncbijs/<new>` to this package's `package.json`.
2. New `src/tools/<new>/<tool>.ts` per exposed function.
3. `getNew()` factory in `src/index.ts`.
4. Register entry in `src/register-tools.ts`.
5. Update the `instructions` prose in `index.ts` so the LLM
   understands what's available.
6. Update root `README.md` (MCP servers section) and root `CLAUDE.md`
   (depends_on of `@ncbijs/http-mcp`).

## Common pitfalls

1. **Stdio buffering on long responses.** PubMed full-text retrieval
   can return many MB of XML. The stdio transport carries it but some
   MCP clients buffer the whole message before parsing. Prefer
   tool designs that return paginated chunks for big payloads (the
   PMC tool already does this).

2. **Concurrent tool calls share the same domain client.** The
   factories cache the first instance. If two parallel tool calls
   share rate budget, you may hit 429s under load. Solution: clients
   already use a `TokenBucket`; just don't expect strict per-call
   parallelism.

3. **Adding a tool without updating `instructions`.** The MCP server's
   top-level `instructions` string is what the LLM reads when
   selecting tools. New tools added without an `instructions` mention
   are still discoverable but harder for the LLM to find. Always
   update the prose when adding a domain.

4. **API key handling.** `NCBI_API_KEY` is read once at startup and
   threaded into client constructors. Rotating keys requires
   restarting the MCP server (Claude Code: kill + reload).

5. **Package is `private` until release.** Currently
   `version: '0.0.1'` per the source. When publishing, update the
   version in `package.json` and ensure `npm publish` is gated to
   the release workflow.

## Testing

```bash
# Unit tests for each tool module
pnpm nx run @ncbijs/http-mcp:test

# Manual: run the server stdio-style and pipe MCP commands
npx tsx packages/http-mcp/src/index.ts
```

E2E coverage of the MCP transport is exercised through Claude Code's
own MCP integration tests, not this repo.

## Files

```
packages/http-mcp/src/
  index.ts                   # bootstrap: env, factories, server, transport
  register-tools.ts          # central tool registration
  tools/
    <domain>/
      <function>.ts          # one tool per file
      <function>.spec.ts     # unit test
  shared/
    schema-helpers.ts        # JSON Schema fragments shared across tools
    error-helpers.ts         # standardised error → MCP response mapping
```
