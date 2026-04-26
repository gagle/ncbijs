# Adding a New Package

Checklist for adding a new package to the ncbijs monorepo. Every step is mandatory.

## 1. Package scaffold

Create `packages/{name}/` with:

- `package.json` -- name, description, version `0.0.1`, ESM exports, workspace dependency on `@ncbijs/rate-limiter` (if rate-limited)
- `project.json` -- Nx targets for build, test, lint, typecheck
- `tsconfig.json` -- extends `../../tsconfig.base.json`, adds `DOM` lib and `vitest/globals` types
- `tsconfig.build.json` -- extends `./tsconfig.json`, excludes specs and fixtures, clears `paths`
- `vitest.config.ts` -- globals, v8 coverage, package-scoped include/exclude
- `eslint.config.mjs` -- `createPackageConfig()` from shared base

## 2. Verify against the live API

**Before writing any interface or mapping code**, hit every NCBI endpoint you plan to wrap and inspect the actual JSON/XML response. This is the single most important step — skipping it causes type mismatches that are painful to find later.

1. **Fetch a real response** for each endpoint (`curl`, browser, or E2E test). Use representative IDs that exercise all optional fields.
2. **Document every field's actual runtime type** (string, number, array of strings, nested object, etc.). Do not trust NCBI documentation alone — the API is the source of truth. Common traps:
   - Fields documented as "integer" that arrive as `"418"` (string).
   - Fields documented but not present in real responses.
   - Fields not documented but present in real responses.
   - Nested structures that differ from flat descriptions.
3. **Write interfaces that match the live response exactly.** If `pssmlength` comes back as a string, type the raw interface as `string`, then convert to `number` in the mapping function.
4. **Use the live response as your test fixture** — paste it into `buildEntry()` helpers so unit tests reflect reality, not assumptions.

## 3. Source files

Use the **flat layout** (default) or the **split layout** depending on whether the package has bulk file parsers. See [Package Architecture](./package-architecture.md) for full details.

**Flat layout** (HTTP client only):

- `src/index.ts` -- single barrel export for the public API
- `src/interfaces/{name}.interface.ts` -- all public types (readonly, ReadonlyArray)
- `src/{name}.ts` -- main class or exported functions
- `src/{name}-client.ts` -- HTTP client helpers (if rate-limited, with `fetchWithRetry` and `{Name}HttpError`)

**Split layout** (HTTP client + bulk parsers):

- `src/index.ts` -- barrel re-exports from both `http/` and `bulk-parsers/`
- `src/interfaces/{name}.interface.ts` -- shared domain types
- `src/http/{name}.ts` -- main class, `src/http/{name}-client.ts` -- HTTP helpers
- `src/bulk-parsers/parse-{format}.ts` -- pure parsing functions

All exported functions, classes, and interfaces must have JSDoc comments. One-line description minimum, with `@param` and `@returns` on functions with non-obvious signatures.

## 4. Tests

- `src/{name}.spec.ts` -- unit tests covering every exported function
- Target: 100% coverage (statements, branches, functions, lines)
- Mock `fetch` with `vi.stubGlobal('fetch', ...)`, clean up with `vi.unstubAllGlobals()`
- Test error paths (empty input, HTTP errors, malformed responses)

## 5. E2E tests

Add the package to the E2E test suite in `e2e/`. E2E tests hit real APIs and run in CI with `NCBI_API_KEY`. Cover the golden path for each public method.

## 6. Documentation

### Package README

Create `packages/{name}/README.md` following the existing pattern:

- Package name heading + one-line description
- Installation section
- Usage section with TypeScript code examples
- API section with constructor/function signatures and config table
- Error handling section
- Response types section with interface definitions

### Root README

Update `README.md`:

- Add a row to the "What can you do with ncbijs?" workflow table
- Add a row to the "Packages" table with npm badge
- Add the package to the "Which package do I need?" decision tree
- Update the "Package capabilities" table if the package has notable capabilities
- Update the "Architecture" section (dependency graph + build order)

### Examples

Create at least one example in `examples/`:

- File name: `{name}-{verb}.ts` (e.g., `rxnorm-drug-lookup.ts`)
- Single-line comment header explaining what the example does
- Self-contained, runnable with `pnpm exec tsx examples/{file}.ts`
- Add the example to `examples/README.md` tables

### Docs index

Add the package to `docs/README.md` "Additional Packages" table.

## 7. MCP server

If the package exposes functionality useful to LLM agents:

- Create a tool registration file in `packages/http-mcp/src/tools/{name}-tools.ts`
- Register tools in `packages/http-mcp/src/register-tools.ts`
- Add Zod schemas with `.describe()` on every parameter
- Write meaningful tool titles and descriptions
- Update `packages/http-mcp/README.md` with the new tools
- Update the MCP server `instructions` string in `packages/http-mcp/src/index.ts`

## 8. Global configuration

Update these files:

| File                         | What to add                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `tsconfig.base.json`         | Path alias: `"@ncbijs/{name}": ["./packages/{name}/src/index.ts"]` |
| `release-please-config.json` | Package entry + linked-versions component                          |
| `commitlint.config.ts`       | Scope name in `scope-enum` array                                   |
| `CLAUDE.md`                  | Scope in formatting section, dependency graph, build order         |

## 9. Verification

```bash
pnpm install
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```

Then run the self-review loop:

1. `/review`
2. `/agent-skills:code-simplify`

Loop until both produce no issues.
