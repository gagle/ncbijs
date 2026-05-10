---
context: 'e2e'
purpose: 'End-to-end tests against real NCBI APIs. One spec per parser. Requires NCBI_API_KEY.'
runtime: 'Node.js (Vitest)'
last_audited: '2026-02-13'
---

# e2e — end-to-end tests against real NCBI APIs

Auto-loaded when working in `e2e/`.

## Purpose

The `e2e/` suite verifies each `@ncbijs/*` package against the **live
NCBI HTTP APIs** — not mocks, not fixtures. Failures here mean either
NCBI changed something or our parsers drifted.

## Conventions

- **One spec per parser/feature.** Prefer `mesh.spec.ts` per package
  rather than one mega-spec. (Memory rule: split parser specs.)
- **Use `ncbiApiKey` from `test-config.ts`.** Never hardcode an API
  key. The key is validated at startup by `global-setup.ts`; tests
  fail fast if `NCBI_API_KEY` is unset.
- **Real HTTP calls.** Don't stub `fetch`. The point is to catch
  real-world breakage.
- **Idempotent assertions.** Live data changes — assert on shapes
  and presence, not exact counts/strings. Example: assert
  `result.idList.length > 0`, not `length === 100`.
- **Rate-limit awareness.** Tests share the global rate budget
  (10 req/s with key). Avoid running all e2e tests in parallel
  against the same key — Vitest's default concurrency is fine.

## Files

| File              | Role                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `test-config.ts`  | `requireEnv('NCBI_API_KEY')` exported as `ncbiApiKey`                   |
| `global-setup.ts` | Runs once before the suite; validates required env vars                 |
| `<package>.spec.ts` | One per `@ncbijs/<package>`. Verifies the public API hits real NCBI.  |
| `mcp.spec.ts`     | Verifies `@ncbijs/http-mcp` round-trips through stdio transport         |

## Running

```bash
# Full suite (requires NCBI_API_KEY env var)
pnpm nx run ncbijs-e2e:e2e

# Single package
pnpm nx run ncbijs-e2e:e2e -- mesh

# With API key inline
NCBI_API_KEY=... pnpm nx run ncbijs-e2e:e2e
```

## Common pitfalls

1. **Forgetting `NCBI_API_KEY`.** `global-setup.ts` will fail-fast
   with a clear message — don't try to silence it.
2. **Hardcoded fixtures.** Don't put fixture data in `e2e/`. That
   belongs in unit tests (`packages/<x>/src/__fixtures__/`). The
   point of e2e is to verify against the *current* NCBI response.
3. **Rate-limit cascades.** If a test hammers an endpoint in a tight
   loop, NCBI returns 429 and downstream tests inherit the cooldown.
   Add modest delays between batched requests when iterating over
   many records.
4. **Assertions on cosmetic fields.** NCBI tweaks formatting/casing
   without notice (e.g. journal name capitalisation). Match the
   shape of the response, not exact text.
5. **Cross-test state.** Each spec should be self-contained — don't
   share `WebEnv`/`query_key` across tests. History Server entries
   expire and test order isn't deterministic across CI environments.
