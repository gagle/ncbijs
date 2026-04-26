---
name: package-architecture
description: >
  Package architecture conventions for the ncbijs monorepo.
  Covers folder structure (flat vs. http+bulk-parsers split), HTTP client pattern,
  bulk parser pattern, shared interfaces, barrel exports, and testing layout.
  Activates when creating, modifying, or restructuring packages.
---

# Package Architecture

Read `docs/package-architecture.md` for the full reference. This skill summarizes the key decisions.

## Layout Decision

```
Does the package have bulk file parsers?
  ├── No  → Flat layout (default)
  └── Yes → Split layout (http/ + bulk-parsers/)
```

## Flat Layout

```
src/
  index.ts
  {name}.ts              # Main class
  {name}-client.ts       # HTTP helpers
  schema.ts              # Zod schemas (optional)
  interfaces/
    {name}.interface.ts
```

## Split Layout

```
src/
  index.ts               # Re-exports from http/, bulk-parsers/, interfaces/
  interfaces/
    {name}.interface.ts  # Shared domain types
  http/
    {name}.ts            # Main class
    {name}-client.ts     # HTTP helpers
    schema.ts            # Zod schemas (optional)
  bulk-parsers/
    parse-{format}.ts    # Pure function: string → typed objects
```

Split packages: `mesh`, `snp`, `pubchem`, `clinvar`, `cite`, `id-converter`, `datasets`, `icite`, `clinical-trials`, `litvar`, `medgen`, `cdd`, `pmc`.

## Key Rules

1. **API-first types** -- fetch a real response from every endpoint BEFORE writing interfaces. Type raw interfaces to match the wire format exactly. Convert to domain types in mapping functions.
2. **Interfaces at `src/interfaces/`** -- shared between HTTP and bulk layers.
3. **Barrel exports from `index.ts` only** -- no other barrel files. Import paths point into subdirectories.
4. **No file extensions in imports** -- post-build script adds `.js`.
5. **Specs co-located** -- `{name}.spec.ts` lives next to `{name}.ts`.
6. **100% coverage** -- statements, branches, functions, lines.
7. **JSDoc on all exports** -- one-line minimum. Bulk parsers add `@see` download URL.
8. **E2E tests** in `e2e/{name}.spec.ts` using `ncbiApiKey` from `e2e/test-config.ts`.

## Checklist

When creating or modifying a package, follow `docs/adding-a-package.md` and verify:

```bash
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```
