# Release and Publish Strategy

## Release-Please

Automated versioning and changelog generation via `googleapis/release-please-action@v4`.

### Configuration

- `release-please-config.json` — defines all 9 packages
- `.release-please-manifest.json` — tracks current versions
- `separate-pull-requests: true` — one PR per package
- `bump-minor-pre-major: true` — breaking changes before 1.0 bump minor, not major
- `bump-patch-for-minor-pre-major: true` — features before 1.0 bump patch

### Independent Versioning

Each package has its own version. `eutils` can be at 1.2.0 while `cite` is at 0.3.0.

### How It Works

1. Push to main with conventional commit: `feat(eutils): add retry logic`
2. Release-please detects the change, creates a PR for `@ncbijs/eutils`
3. PR bumps version in `package.json`, updates `CHANGELOG.md`
4. Merging the PR triggers the publish workflow
5. Publish job runs `tsc` build → `prepare-dist` → `pnpm publish`

## Publish Pipeline

### gagle/prepare-dist@v1

Custom GitHub Action that prepares `dist/` for npm publishing:

1. Copies `README.md`, `LICENSE`, `CHANGELOG.md` into `dist/`
2. Transforms `package.json`: removes `scripts`, `devDependencies`, `files`; strips `dist/` prefix from all paths
3. Verifies tag version matches package.json version

### npm Provenance

All packages published with `--provenance` flag:

- Requires `id-token: write` permission in GitHub Actions
- Links npm package to GitHub source commit
- Generates SLSA-compliant build attestation

### workspace:\* Protocol

Internal dependencies use `workspace:*`:

```json
{
  "dependencies": {
    "@ncbijs/eutils": "workspace:*",
    "@ncbijs/pubmed-xml": "workspace:*"
  }
}
```

At publish time, pnpm replaces `workspace:*` with the actual version from the dependency's `package.json`. Example: `workspace:*` → `^0.1.0`.

### Publish from dist/

The `pnpm publish` command runs from `packages/<name>/dist/`:

```yaml
- run: pnpm publish --no-git-checks --provenance
  working-directory: packages/eutils/dist
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Users get a flat package: `import { EUtils } from '@ncbijs/eutils'` resolves to `node_modules/@ncbijs/eutils/index.js` (no `dist/` prefix).

### Publish Guard

Each package has `"prepublishOnly": "echo 'Use CI to publish' && exit 1"` to prevent accidental local `npm publish`.

## CI Pipeline

### Jobs (ci.yml)

1. **setup** — Install deps, build all packages, cache `packages/*/dist`
2. **lint** — ESLint + TypeScript typecheck
3. **test** — Vitest with coverage (Node 18/20/22/24 matrix)
4. **e2e** — Integration tests against real NCBI APIs (needs `NCBI_API_KEY` secret)
5. **coverage** — Upload coverage artifacts, PR comments

### Release Jobs (release.yml)

1. **release-please** — Detect releasable changes, create PRs
2. **publish-{package}** — One job per package, conditional on `release_created` output

## Secrets Required

- `NPM_TOKEN` — npm publish token
- `NCBI_API_KEY` — NCBI API key for E2E tests (10 req/s rate limit)
