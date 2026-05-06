---
name: verify
description: Verify ncbijs — wraps /solo-npm:verify with full Nx monorepo verification (lint, typecheck, build, unit tests, e2e, demo build), prefixed by an ncbi-api-monitor pre-flight check.
---

# Verify (ncbijs)

Composes /solo-npm:verify with this repo's full verification suite plus an NCBI API drift gate.

## Repo context

- Workspace: pnpm + Nx monorepo
- Verification spans 4 steps. Run sequentially; halt on first failure.

## Steps

### 0. Pre-flight — open ncbi-api-monitor issues

NCBI API drift is detected weekly by `.github/workflows/ncbi-api-monitor.yml`, which opens issues labelled `ncbi-api-monitor` when HIGH or MEDIUM changes are found. This step blocks releases on unaddressed drift.

```bash
gh issue list --label ncbi-api-monitor --repo gagle/ncbijs --state open --json number,title,url
```

For each open issue, parse the title with regex `(\d+)\s+HIGH,\s+(\d+)\s+MEDIUM,\s+(\d+)\s+LOW` and sum HIGH + MEDIUM counts across all open issues. The title format is fixed by the monitor workflow: `NCBI API changes detected (DATE): N changes detected: X HIGH, Y MEDIUM, Z LOW`.

| Sum HIGH + MEDIUM (across all open) | Sum LOW | Action                                                                                                                                                  |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| > 0                                 | any     | **HALT** verify. Print `#N`, title, URL of each blocking issue. Tell the user to triage via `/ncbi-check-updates` and re-run. Do not proceed to Step 1. |
| 0                                   | > 0     | Print informational line listing the LOW-only issues. **Continue** to Step 1.                                                                           |
| 0                                   | 0       | Print `✓ No open ncbi-api-monitor issues`. Continue.                                                                                                    |

**Failure tolerance**: if `gh` is not installed, not authenticated, or the network is unavailable, print a warning and **continue** to Step 1. Infrastructure failure must not block release; the AI surfaces the problem to the user and proceeds.

### 1. Lint + Typecheck + Build + Unit tests

```bash
pnpm nx run-many -t lint typecheck build test
```

Nx parallelizes across packages and reuses cached results for unchanged ones.

### 2. E2E tests

Requires `NCBI_API_KEY`. The key is loaded automatically:

- **Locally**: `e2e/global-setup.ts` parses `.env` into `process.env` before any test imports `e2e/test-config.ts`. The file is gitignored — create it with `NCBI_API_KEY=<your-key>` if missing.
- **CI**: `.github/workflows/release.yml` injects it from `${{ secrets.NCBI_API_KEY }}` on the e2e step.

If `.env` is missing locally and no env var is set, `global-setup.ts` throws — the test process never starts.

```bash
pnpm nx run ncbijs-e2e:e2e
```

### 3. Demo build

```bash
pnpm nx run demo:build
```

## Workflow

Invoke `/solo-npm:verify` for the opinionated baseline. Run the steps above in order; halt on first failure; surface full output.

## Report

After all steps complete, print a summary in this shape:

```
Pre-flight:
  ✓ No open ncbi-api-monitor issues          # all clear
  ⚠️ N open ncbi-api-monitor issues (LOW only — informational)
  ✗ HALTED: N HIGH/MEDIUM ncbi-api-monitor issues open

Verification complete:
  ✓ Lint + Typecheck + Build + Unit tests (Nx run-many)
  ✓ E2E tests (XXX/XXX passed; YY skipped)
  ✓ Demo build
```

Only print the verification block if Step 0 did not HALT.

If `gh` was unavailable at Step 0:

```
Pre-flight:
  ⚠️ Skipped — gh issue list failed (<reason>); proceeding without drift check
```
