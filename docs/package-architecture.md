# Package Architecture

Conventions for how packages are structured in the ncbijs monorepo.

## Two Layouts

### Flat layout (default)

For packages with HTTP client only (no bulk file parsers):

```
packages/{name}/src/
  index.ts                            # Single barrel export
  {name}.ts                           # Main class (HTTP methods, TokenBucket)
  {name}.spec.ts                      # Unit tests
  {name}-client.ts                    # fetchWithRetry, {Name}HttpError
  {name}-client.spec.ts               # Unit tests
  schema.ts                           # Zod/OpenAPI response schemas (if needed)
  interfaces/
    {name}.interface.ts               # All public types
```

### Split layout (http + bulk-parsers)

For packages that have both an HTTP client AND offline/bulk file parsers:

```
packages/{name}/src/
  index.ts                            # Barrel re-exports from both subdirectories
  interfaces/
    {name}.interface.ts               # Shared domain types (used by both layers)
  http/
    {name}.ts                         # Main class (HTTP methods, TokenBucket)
    {name}.spec.ts                    # Unit tests
    {name}-client.ts                  # fetchWithRetry, {Name}HttpError
    {name}-client.spec.ts             # Unit tests
    schema.ts                         # Zod/OpenAPI response schemas (if needed)
  bulk-parsers/
    parse-{format}.ts                 # Bulk file parser (pure function)
    parse-{format}.spec.ts            # Unit tests
```

**When to use split layout**: Use the split layout when a package has both HTTP client methods AND offline/bulk file parsers. Currently 13 packages use this layout: `mesh`, `snp`, `pubchem`, `clinvar`, `cite`, `id-converter`, `datasets`, `icite`, `clinical-trials`, `litvar`, `medgen`, `cdd`, `pmc`.

## HTTP Layer (`http/`)

The HTTP layer contains everything related to live API communication:

- **`{name}.ts`** -- Main class exposing public methods. Uses `TokenBucket` from `@ncbijs/rate-limiter` for rate limiting. Each method calls `fetchWithRetry` from the client helper.
- **`{name}-client.ts`** -- Low-level HTTP helpers. Exports `fetchWithRetry` (exponential backoff) and `{Name}HttpError` (typed error class). Only imports from `@ncbijs/rate-limiter`.
- **`schema.ts`** -- Zod schemas matching OpenAPI response shapes. Used for runtime validation of HTTP responses.

## Bulk Parsers Layer (`bulk-parsers/`)

The bulk parsers layer contains pure functions that parse downloaded NCBI files:

- **`parse-{format}.ts`** -- Pure function: `(rawText: string) => ReadonlyArray<TypedRecord>`. No HTTP, no side effects. Imports only from `../interfaces/`.
- **Naming**: File names always start with `parse-` followed by the data format or source (e.g., `parse-variant-summary-tsv.ts`, `parse-refsnp-json.ts`, `parse-mesh-descriptor-xml.ts`).
- **JSDoc**: Every parser function must document the bulk data source with a `@see` link to the download URL and a cross-reference to the HTTP equivalent (if one exists).

## Shared Interfaces (`interfaces/`)

The `interfaces/` directory sits at the `src/` level and contains domain types used by both layers:

- **One file per package**: `{name}.interface.ts` (e.g., `clinvar.interface.ts`).
- **All properties `readonly`**, all arrays `ReadonlyArray<T>`.
- **Exported from `index.ts`** via `export type { ... } from './interfaces/{name}.interface'`.

Types that are specific to only one layer (e.g., HTTP-only request options, bulk-only input types) may live in that layer's files. Only create a separate interface file in `http/` or `bulk-parsers/` if the type count warrants it.

## Barrel Exports (`index.ts`)

Each package has a single `src/index.ts` entry point. It re-exports from all subdirectories:

```ts
// Types (shared)
export type { VariantReport, ClinVarConfig, ... } from './interfaces/clinvar.interface';

// HTTP layer
export { ClinVarHttpError } from './http/clinvar-client';
export { ClinVar } from './http/clinvar';

// Bulk parsers
export { parseVariantSummaryTsv } from './bulk-parsers/parse-variant-summary-tsv';
```

No other barrel files exist. Consumers import from `@ncbijs/{name}`, never from internal paths.

## Shared Utilities

Some packages have utility files that serve both layers (e.g., `validate.ts` in `id-converter`). These stay at the `src/` level alongside `interfaces/` and `index.ts`.

## Testing

- **Co-located specs**: Each `.ts` file has a `.spec.ts` sibling in the same directory.
- **100% coverage**: Statements, branches, functions, lines.
- **HTTP mocks**: `vi.stubGlobal('fetch', ...)` + `afterEach(() => vi.unstubAllGlobals())`.
- **Bulk parser tests**: Inline fixture strings for small data, `__fixtures__/` directory for larger files.
- **E2E tests**: `e2e/{name}.spec.ts` hits real APIs. Uses `ncbiApiKey` from `e2e/test-config.ts`.

## JSDoc

All exported functions, classes, interfaces, and types must have JSDoc:

- One-line description minimum.
- `@param` and `@returns` on functions with non-obvious signatures.
- Bulk parsers: include `@see` link to the NCBI download source.

## MCP Server Registration

If the package exposes functionality useful to LLM agents:

1. Create `packages/http-mcp/src/tools/{name}-tools.ts`
2. Register in `packages/http-mcp/src/register-tools.ts`
3. Add Zod schemas with `.describe()` on every parameter
4. Update `packages/http-mcp/README.md` and the `instructions` string in `packages/http-mcp/src/index.ts`

## README and Examples

- **Package README** (`packages/{name}/README.md`): Installation, usage with code examples, API reference, error handling, response types.
- **Root README**: Add to workflow table, packages table, decision tree, architecture section.
- **Examples** (`examples/{name}-{verb}.ts`): Self-contained, runnable with `pnpm exec tsx examples/{file}.ts`. Update `examples/README.md`.
- **Docs index** (`docs/README.md`): Add link to new package.

## Global Configuration

| File                         | What to add                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `tsconfig.base.json`         | Path alias: `"@ncbijs/{name}": ["./packages/{name}/src/index.ts"]` |
| `release-please-config.json` | Package entry + linked-versions component                          |
| `commitlint.config.ts`       | Scope name in `scope-enum` array                                   |
| `CLAUDE.md`                  | Scope in formatting section, dependency graph, build order         |

## Verification

After any package change:

```bash
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```
