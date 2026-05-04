# Release and Publish Strategy

## `/release` Skill

The `/release` Claude Code skill handles versioning, changelog generation, and tag-triggered publishing. All packages share a single version (linked versioning).

### How It Works

1. Run `/release` from the repo root
2. The skill runs local checks (`pnpm lint && pnpm build && pnpm typecheck && pnpm test`)
3. Collects conventional commits since the last `v*` tag and determines the version bump
4. Confirms the bump with the user, then:
   - Updates `version` in root `package.json` and every `packages/*/package.json`
   - Prepends a new section to `CHANGELOG.md`
   - Commits: `chore(workspace): release v{version}`
   - Pushes the commit to main
5. Monitors CI in the background (Phase 2)
6. Once CI is green, creates and pushes a `v{version}` tag
7. The tag triggers `release.yml`, which publishes all packages to npm

### Linked Versioning

All packages share the same version. A single `v{version}` tag (e.g., `v1.0.0`) triggers the publish workflow for every package.

### Version Bump Rules

| Condition                                                    | Bump           |
| ------------------------------------------------------------ | -------------- |
| Any commit with `!` after type or `BREAKING CHANGE:` in body | **major**      |
| Any `feat` commit                                            | **minor**      |
| Any `fix`, `perf`, or `revert` commit                        | **patch**      |
| None of the above                                            | **no release** |

### Configuration

- `.claude/skills/release/SKILL.md` -- skill definition
- `CHANGELOG.md` -- generated changelog (prepend-only)

## Publish Pipeline

### release.yml

Triggered by `v*` tag push. Publishes all packages with npm OIDC provenance.

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

1. **setup** -- Install deps, build all packages, cache `packages/*/dist`
2. **lint** -- ESLint + TypeScript typecheck
3. **test** -- Vitest with coverage (Node 18/20/22/24 matrix)
4. **e2e** -- Integration tests against real NCBI APIs (needs `NCBI_API_KEY` secret)
5. **coverage** -- Upload coverage artifacts, PR comments

### Publish Jobs (release.yml)

Triggered by `v*` tag push. Builds all packages and publishes each one to npm with OIDC provenance.

## Secrets Required

- `NPM_TOKEN` -- npm publish token
- `NCBI_API_KEY` -- NCBI API key for E2E tests (10 req/s rate limit)
