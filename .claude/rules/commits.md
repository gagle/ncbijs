# Commit Conventions

This monorepo uses [Conventional Commits](https://www.conventionalcommits.org/).

Format: `type(scope): description`

- **type**: `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style` | `ci` | `perf` | `build`
- **scope**: package directory name in `packages/` (without `@ncbijs/` prefix), or `workspace` for monorepo-wide changes
- **description**: imperative mood, lowercase, no trailing period

## Scope discovery

The valid scope list is **the live `packages/` directory** — do not maintain
a static enum. To list current scopes: `ls packages/`. Examples:

- `packages/eutils/` → scope `eutils`
- `packages/pubmed-xml/` → scope `pubmed-xml`
- `packages/store-mcp/` → scope `store-mcp`

For changes that touch multiple packages or root-level config, use scope
`workspace` (e.g., `chore(workspace): bump pnpm version`).

## Examples (from this repo's history)

- `feat(eutils): add esearch retmax handling`
- `fix(blast): correct response parsing for empty hits`
- `chore(workspace): drop commitlint and lint-staged`
- `docs(rate-limiter): clarify token-bucket semantics`

## Why no runtime enforcement

Solo-dev + AI workflow: Claude writes conformant commits and pre-push
verify catches real breakage. CHANGELOGs are managed manually per
package, and the release flow (`release.yml`) is tag-triggered — no
automated tooling parses commit messages. The convention is for **human
readability and CHANGELOG curation**, not gating.
