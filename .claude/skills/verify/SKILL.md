---
name: verify
description: Verify ncbijs — wraps /solo-npm:verify with full Nx monorepo verification (lint, typecheck, build, unit tests, e2e, demo build).
---

# Verify (ncbijs)

Composes /solo-npm:verify with this repo's full verification suite.

## Repo context

- Workspace: pnpm + Nx monorepo
- Verification spans 6 steps. Run sequentially; halt on first failure.

## Steps

### 1. Lint + Typecheck + Build + Unit tests

```bash
pnpm nx run-many -t lint typecheck build test
```

Nx parallelizes across packages and reuses cached results for unchanged
ones.

### 2. E2E tests

Requires `NCBI_API_KEY` environment variable. Skip if not available and
warn the user.

```bash
pnpm nx run ncbijs-e2e:e2e
```

### 3. Demo build

```bash
pnpm nx run demo:build
```

## Workflow

Invoke `/solo-npm:verify` for the opinionated baseline. Run the steps
above in order; halt on first failure; surface full output.

## Report

After all steps pass, print a summary:

```
Verification complete:
  ✓ Lint + Typecheck + Build + Unit tests (Nx run-many)
  ✓ E2E tests
  ✓ Demo build
```

If e2e was skipped:

```
  ⊘ E2E tests (skipped — no NCBI_API_KEY)
```
