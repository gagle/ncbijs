# CLAUDE.md

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
```

## Architecture

- **Monorepo**: Nx 22 + pnpm 10.15 workspaces
- **Language**: TypeScript 6, ES2022 target, `strict: true`
- **Module**: ESM-only (`"type": "module"`), `moduleResolution: "bundler"`, no `.js` in source imports
- **Build**: `tsc` + post-build script (`scripts/add-import-extensions.mjs`) adds `.js` to compiled output
- **Zero-dep philosophy**: Most packages have zero runtime dependencies. `eutils` depends on `rate-limiter` + `openapi-fetch`. `datasets`, `blast`, `snp`, `clinvar`, `pubchem`, `clinical-trials`, `icite`, `rxnorm`, `litvar`, `bioc`, `cite`, `mesh`, `id-converter`, `pubtator`, `clinical-tables` depend on `rate-limiter`. `pubmed` and `pmc` depend only on internal `@ncbijs/*` packages.
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
                  ├─ litvar
                  ├─ bioc
                  ├─ cite
                  ├─ mesh
                  ├─ id-converter
                  ├─ pubtator
                  └─ clinical-tables
fasta  (zero-dep, independent)
```

### Build order (Nx topological)

1. Zero-dep parallel: `rate-limiter`, `xml`, `fasta`
2. `id-converter`, `mesh`, `cite`, `litvar`, `bioc`, `clinical-tables`, `eutils`, `datasets`, `blast`, `snp`, `pubchem`, `pubmed-xml`, `jats`, `pubtator`, `clinvar`, `clinical-trials`, `icite`, `rxnorm`
3. `pubmed` (after `eutils` + `pubmed-xml`), `pmc` (after `eutils` + `jats` + `rate-limiter`)

## Rules and Skills

This repo includes `.claude/` configuration that Claude reads automatically:

- **`.claude/rules/typescript.md`** -- TypeScript coding conventions (naming, types, imports, formatting)
- **`.claude/skills/testing/`** -- Testing conventions with 18 enforced rules
- **`.claude/skills/review/`** -- Code review process and evaluation criteria
- **`.claude/skills/commit/`** -- Composable git workflow: `/commit`, `/commit squash`, `/commit push`, `/commit squash push`
- **`.claude/skills/explore-codebase/`** -- Knowledge graph navigation
- **`.claude/skills/debug-issue/`** -- Systematic debugging
- **`.claude/skills/refactor-safely/`** -- Safe refactoring with dependency analysis

See `CONTRIBUTING.md` for the contribution policy.

## Conventions

### Imports

```ts
import { EUtils } from '@ncbijs/eutils'; // path alias (no extension)
import { helper } from './helpers/my-helper'; // relative (no extension)
import type { Config } from './interfaces/x'; // type imports separated
```

### Types

- All interfaces live in `src/interfaces/{feature}.interface.ts`
- All properties are `readonly`
- Use generic `Array<T>` syntax, not `T[]` (ESLint enforced)
- Separate `import type` from value imports (ESLint enforced)
- No `any` (ESLint enforced)
- Unused vars must be prefixed with `_`

### File structure (per package)

```
packages/{name}/
  src/
    index.ts                        # Re-exports public API
    interfaces/{feature}.interface.ts
    {feature}.ts
    {feature}.spec.ts               # Co-located tests
  package.json, project.json, tsconfig.json, tsconfig.build.json
  vitest.config.ts, eslint.config.mjs
```

### Testing

- **Framework**: Vitest 4 with `globals: true`, v8 coverage
- **Target**: 100% coverage (statements, branches, functions, lines)
- **Mocking**: `vi.stubGlobal('fetch', ...)` + `afterEach(() => vi.unstubAllGlobals())`
- **Fixtures**: Small inline XML strings; large in `__fixtures__/` directory

### Formatting

- Prettier: 100 width, single quotes, trailing commas, 2-space indent, LF
- Commit: `{type}({scope}): {subject}` (conventional commits via commitlint)
- Scopes: `eutils`, `pubmed-xml`, `pubmed`, `jats`, `pmc`, `id-converter`, `pubtator`, `mesh`, `cite`, `http-mcp`, `store`, `store-mcp`, `rate-limiter`, `xml`, `fasta`, `datasets`, `blast`, `snp`, `clinvar`, `pubchem`, `clinical-trials`, `icite`, `rxnorm`, `litvar`, `bioc`, `clinical-tables`, `workspace`

### Adding a new package

See **[docs/adding-a-package.md](./docs/adding-a-package.md)** for the full checklist. Summary:

1. Create `packages/{name}/` with `src/`, `package.json`, `project.json`, tsconfigs, vitest, eslint
2. Write source, interfaces, and tests (100% coverage)
3. Add JSDoc on all exported functions, classes, and interfaces
4. Add E2E tests in `e2e/`
5. Create `README.md` for the package
6. Update root `README.md` (workflow table, packages table, decision tree, architecture)
7. Create example in `examples/` and update `examples/README.md`
8. Update `docs/README.md` with the new package
9. Register MCP tools if applicable (tool file, register, descriptions, README)
10. Update global configs: `tsconfig.base.json`, `release-please-config.json`, `commitlint.config.ts`
11. Run `pnpm install && pnpm lint && pnpm build && pnpm typecheck && pnpm test`

## Verification

After ANY code change, run lint, build, and test before marking work complete:

```bash
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```

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
