---
name: release
description: Release ncbijs packages — wraps /solo-npm:release with monorepo specifics.
---

# Release (ncbijs)

Composes /solo-npm:release with this repo's specifics.

## Repo context

- Workspace: pnpm + Nx monorepo at `packages/*`
- Versioning: unified across all packages — single git tag bumps every package
- Publish: per-package matrix in `release.yml`; uses `gagle/prepare-dist`
  to translate source `package.json` → `dist/package.json` (strip `dist/`
  prefix from paths, drop dev fields, copy README/LICENSE)
- Repo slug: `gagle/ncbijs`
- Workflow: `release.yml`
- Verification: `/verify` runs `pnpm nx run-many -t lint typecheck build test`

## Workflow

Invoke `/solo-npm:release` for the opinionated three-phase baseline. The
repo context above tells you what to expect for workspace shape, the
prepare-dist translation step, and verification commands.

## Deviations from the baseline

(none today)
