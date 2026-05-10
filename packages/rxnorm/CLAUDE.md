---
package: '@ncbijs/rxnorm'
purpose: 'Typed client for the NLM RxNav RxNorm REST API. Resolve drug names to RxCUI concepts, walk concept relationships by term type (TTY), look up properties, NDC codes, drug classes (RxClass: ATC / VA / MED-RT / FDA SPL), and historical remappings.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'RxNorm'
  - 'RxNormHttpError'
  - 'RxNormConfig'
  - 'RxConcept'
  - 'RxConceptProperties'
  - 'RxConceptHistory'
  - 'DrugGroup'
  - 'ConceptGroup'
  - 'ApproximateTermOptions'
  - 'RxTermCandidate'
  - 'RxProperty'
  - 'RxClassDrugInfo'
  - 'RxClassConcept'
  - 'RxClassMember'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-23'
---

# @ncbijs/rxnorm

## Purpose

Wraps the **NLM RxNav RxNorm REST API**
(`https://rxnav.nlm.nih.gov/REST`) — the U.S. National Library of
Medicine's controlled vocabulary for normalized clinical drug names,
with bridges to ATC, VA, MED-RT, and FDA Structured Product Labels via
RxClass, plus NDC mappings. **RxNav is hosted by NLM, not NCBI; it is
not an Entrez E-utility, does not share the eutils host, rate budget,
`tool`/`email` headers, or `api_key` mechanism.**

The package wraps the most commonly used endpoints under
`/rxcui`, `/drugs`, `/spellingsuggestions`, `/approximateTerm`,
`/historystatus`, `/allProperties`, and `/rxclass/...`, mapping each
nested wire structure to flat domain types.

## When to use

- Normalize a free-text drug name to an RxCUI concept (`rxcui`,
  `approximateTerm`).
- Walk RxNorm relationships by term type (`relatedByType`) — e.g. find
  all branded packages (`SBD`, `SBDC`) for a clinical drug (`SCD`).
- Get full concept properties (`properties`, `allProperties`).
- Resolve a drug to its therapeutic classes via RxClass (ATC, VA,
  MED-RT, FDA SPL).
- Map an RxCUI to its NDC packaging codes for claims-data joins.
- Trace remapping history of a deprecated RxCUI (`history`).

## When NOT to use

| Goal                                              | Use instead                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| Look up a chemical by structure or formula        | `@ncbijs/pubchem`                                |
| Find FDA-approved drug labels                     | `@ncbijs/dailymed`                               |
| Search PubMed for drug-related publications       | `@ncbijs/pubmed`                                 |
| Get clinical trials for a drug                    | `@ncbijs/clinical-trials`                        |
| Run any NCBI Entrez query                         | `@ncbijs/eutils` (different host, different rate limit) |
| Autocomplete with non-RxNorm vocabularies (ICD-10, LOINC, SNOMED) | `@ncbijs/clinical-tables`         |

## Exports

| Export                   | Kind      | Purpose                                                          |
| ------------------------ | --------- | ---------------------------------------------------------------- |
| `RxNorm`                 | class     | HTTP client; `new RxNorm(config?)`                               |
| `RxNormHttpError`        | class     | Thrown on non-2xx with `status` + `body`                         |
| `RxNormConfig`           | interface | `{ maxRetries? }`                                                |
| `RxConcept`              | interface | `{ rxcui, name, tty }` — minimal concept                         |
| `RxConceptProperties`    | interface | `{ rxcui, name, synonym, tty, language, suppress }`              |
| `RxConceptHistory`       | interface | `{ rxcui, name, status, remappedTo }`                            |
| `DrugGroup`              | interface | `{ name, conceptGroup: ReadonlyArray<ConceptGroup> }`            |
| `ConceptGroup`           | interface | `{ tty, conceptProperties: ReadonlyArray<RxConcept> }`           |
| `ApproximateTermOptions` | interface | `{ maxEntries?, option? }` (option ∈ `0 \| 1`)                   |
| `RxTermCandidate`        | interface | `{ rxcui, name, score, rank }`                                   |
| `RxProperty`             | interface | `{ category, name, value }`                                      |
| `RxClassDrugInfo`        | interface | Drug↔class edge with `rela` + `relaSource`                       |
| `RxClassConcept`         | interface | `{ classId, className, classType }`                              |
| `RxClassMember`          | interface | Drug member of a class — `{ rxcui, name, tty }`                  |

## API surface

### `new RxNorm(config?)`

```ts
const rx = new RxNorm({ maxRetries: 3 });
```

No required fields. The constructor builds a private `TokenBucket`
sized to **2 req/s** (RxNav fair-use cap) and is not shared across
instances.

### `rxcui(name): Promise<RxConcept | undefined>`

```ts
const c = await rx.rxcui('aspirin');
c?.rxcui; // '1191'
```

Exact-match name lookup. Returns `undefined` (not `null`, not a
thrown error) when no concept matches. **Note**: only `rxcui` is
populated — `name` and `tty` are returned as empty strings since the
endpoint doesn't echo them. Follow up with `properties(rxcui)` for the
full record.

### `properties(rxcui): Promise<RxConceptProperties>`

Full property block for a single concept. All fields default to `''`
when missing.

### `relatedByType(rxcui, types): Promise<ReadonlyArray<RxConcept>>`

```ts
const branded = await rx.relatedByType('1191', ['SBD', 'SBDC']);
```

`types` is space-joined into the `tty` query parameter. Returns the
flat union of `conceptProperties` across all matching concept groups —
the per-group structure is collapsed.

### `drugs(name): Promise<DrugGroup>`

Returns the full grouped result (preserves the per-TTY structure,
unlike `relatedByType`). Useful when you need to know which TTY each
concept belongs to without re-querying.

### `spelling(name): Promise<ReadonlyArray<string>>`

Spelling suggestions. Returns `[]` if the suggestion list is missing.

### `ndcByRxcui(rxcui): Promise<ReadonlyArray<string>>`

NDC packaging codes mapped to a concept. Returns `[]` if none.

### `approximateTerm(name, options?): Promise<ReadonlyArray<RxTermCandidate>>`

Fuzzy lookup. `score` and `rank` are mapped from string to number via
`Number()`. `options.option` is the documented `0` (best match) or `1`
(all approximations).

### `history(rxcui): Promise<RxConceptHistory>`

Includes `remappedTo` — the array of RxCUIs the deprecated concept now
points to, extracted from
`derivedConcepts.remappedConcept[].remappedRxCui`. Empty when the
concept is still active.

### `allProperties(rxcui, properties): Promise<ReadonlyArray<RxProperty>>`

`properties` is space-joined into the `prop` query parameter
(e.g. `['NAMES', 'SOURCES']`). Returns one `RxProperty` per propConcept
in the response.

### `classByDrugName(drugName, relaSource?)`, `classByRxcui(rxcui, relaSource?)`

RxClass forward queries (drug → classes). `relaSource` filters the
relationship source — `'ATC'`, `'VA'`, `'MEDRT'`, `'FDASPL'`.

### `classMembers(classId, relaSource?)`

RxClass reverse query (class → drugs). Reads `minConcept` for each
member; collaborator class metadata is not surfaced.

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx       |

No authentication. Do not pass `apiKey`, `tool`, or `email` here —
RxNav has no such concept and any extra fields are silently ignored.

## Rate limiting & credentials

- Token bucket refills at **2 req/s**, per instance. Distinct from the
  3 / 10 req/s eutils budget. RxNav publishes a soft fair-use cap of
  ~20 req/s but this client deliberately stays at 2 to avoid throttling
  during burst traffic; raise it only with a known-good empirical
  basis.
- No authentication header. The API is unauthenticated.
- The client sets `Accept: application/json`. RxNav also speaks XML on
  the same paths via `.xml` suffix — this package uses the `.json`
  variants exclusively.

## Cross-package wiring

- **Imports.** `import { RxNorm } from '@ncbijs/rxnorm'`.
- **Composes with `@ncbijs/rate-limiter`** — uses `TokenBucket` and
  `fetchWithRetry`; `RxNormHttpError` extends `HttpRetryError`.
- **Used by `@ncbijs/http-mcp`** — `register-tools.ts` imports
  `RxNorm` and `tools/rxnorm-tools.ts` exposes the `drug-lookup` MCP
  tool.
- **Pairs with `@ncbijs/dailymed`** for FDA label data on the same
  drug. RxNav and DailyMed are sibling NLM services with overlapping
  but distinct identifiers — translate via `setid` / `rxcui` before
  joining.

## Common pitfalls

1. **`rxcui(name)` returns a stub, not a populated concept.** The
   `/rxcui.json?name=` endpoint only echoes the matching `rxnormId[]`,
   so this method sets `name: ''` and `tty: ''` even on success.
   Callers that want the full record must follow up with
   `properties(rxcui)` or `drugs(name)`.

2. **Don't mix RxNav quota with eutils.** RxNav is 2 req/s on this
   client; eutils is 3 (or 10) req/s on `@ncbijs/eutils`. The token
   buckets are per-instance and per-host — they do not share quota and
   you do not need to coordinate them. Conversely, do not pass an NCBI
   `apiKey` here: it is silently ignored.

3. **`relatedByType` collapses the TTY grouping; `drugs` preserves it.**
   If downstream code needs to know which TTY a concept belongs to,
   call `drugs(name)` (returns `DrugGroup` with per-TTY
   `conceptGroup[]`). `relatedByType` returns a flat
   `ReadonlyArray<RxConcept>` and the original group boundary is lost.

4. **`approximateTerm` scores are stringly-typed on the wire.** RxNav
   returns `score` and `rank` as strings; this client casts via
   `Number()`. A missing or unparseable score becomes `0` — that's a
   real candidate at the bottom of the ranking, not a "no value"
   sentinel. If you need to detect missing scores, query the raw
   response yourself.

5. **`relaSource` filter is opaque.** The four documented values
   (`'ATC'`, `'VA'`, `'MEDRT'`, `'FDASPL'`) are not validated by this
   client — typos are forwarded to the server which usually returns an
   empty list rather than a 4xx. If a class query returns `[]`,
   double-check the source spelling before assuming the drug is
   unclassified.

6. **`history(rxcui)` only returns `remappedTo` for "Remapped" status.**
   Active concepts return `status: 'Active'` with `remappedTo: []`. A
   non-empty `remappedTo` is the signal the concept is deprecated —
   don't infer it from the status string alone, since RxNav uses
   several status labels.

7. **NDC codes are 11-digit normalized strings.** `ndcByRxcui` returns
   the 5-4-2 normalized form. Claims data sometimes uses the
   10-character labeler-product-package form — convert before joining.

## Testing

```bash
pnpm nx run @ncbijs/rxnorm:test
pnpm nx run @ncbijs/rxnorm:typecheck
pnpm nx run @ncbijs/rxnorm:lint
pnpm nx run @ncbijs/rxnorm:build

# E2E (real RxNav)
pnpm nx run ncbijs-e2e:e2e -- rxnorm
```

HTTP unit tests stub `fetch` via `vi.stubGlobal`. Coverage target:
100% across statements, branches, functions, lines.

## Files

```
packages/rxnorm/src/
  index.ts                                # public re-exports
  rxnorm.ts                               # RxNorm class (all endpoints + raw → domain mappers)
  rxnorm-client.ts                        # fetchJson + RxNormHttpError
  rxnorm.spec.ts
  rxnorm-client.spec.ts
  interfaces/
    rxnorm.interface.ts                   # all public domain types
```
