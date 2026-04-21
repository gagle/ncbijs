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

## 2. Source files

- `src/index.ts` -- single barrel export for the public API
- `src/interfaces/{name}.interface.ts` -- all public types (readonly, ReadonlyArray)
- `src/{name}.ts` -- main class or exported functions
- `src/{name}-client.ts` -- HTTP client helpers (if rate-limited, with `fetchWithRetry` and `{Name}HttpError`)

All exported functions, classes, and interfaces must have JSDoc comments. One-line description minimum, with `@param` and `@returns` on functions with non-obvious signatures.

## 3. Tests

- `src/{name}.spec.ts` -- unit tests covering every exported function
- Target: 100% coverage (statements, branches, functions, lines)
- Mock `fetch` with `vi.stubGlobal('fetch', ...)`, clean up with `vi.unstubAllGlobals()`
- Test error paths (empty input, HTTP errors, malformed responses)

## 4. E2E tests

Add the package to the E2E test suite in `e2e/`. E2E tests hit real APIs and run in CI with `NCBI_API_KEY`. Cover the golden path for each public method.

## 5. Documentation

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

## 6. MCP server

If the package exposes functionality useful to LLM agents:

- Create a tool registration file in `packages/mcp/src/tools/{name}-tools.ts`
- Register tools in `packages/mcp/src/register-tools.ts`
- Add Zod schemas with `.describe()` on every parameter
- Write meaningful tool titles and descriptions
- Update `packages/mcp/README.md` with the new tools
- Update the MCP server `instructions` string in `packages/mcp/src/index.ts`

## 7. Global configuration

Update these files:

| File                         | What to add                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `tsconfig.base.json`         | Path alias: `"@ncbijs/{name}": ["./packages/{name}/src/index.ts"]` |
| `release-please-config.json` | Package entry + linked-versions component                          |
| `commitlint.config.ts`       | Scope name in `scope-enum` array                                   |
| `CLAUDE.md`                  | Scope in formatting section, dependency graph, build order         |

## 8. Verification

```bash
pnpm install
pnpm lint && pnpm build && pnpm test
```

Then run the self-review loop:

1. `/review`
2. `/agent-skills:code-simplify`

Loop until both produce no issues.
