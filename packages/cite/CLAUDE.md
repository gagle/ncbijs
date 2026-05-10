---
package: '@ncbijs/cite'
purpose: 'Citation formatting in 4 styles (RIS, MEDLINE, CSL-JSON, NLM Citation/AMA-APA-MLA-NLM bundle) via the NCBI Literature Citation Exporter API, plus an offline `formatCitation` that renders the same formats from a parsed `PubmedArticle`.'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
  - '@ncbijs/pubmed-xml'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'Cite'
  - 'CiteHttpError'
  - 'formatCitation'
  - 'CitationData'
  - 'CitationFormat'
  - 'CitationSource'
  - 'CitationStyle'
  - 'CSLData'
  - 'CiteConfig'
related_docs:
last_audited: '2026-02-24'
---

# @ncbijs/cite

## Purpose

Citation rendering is style-sensitive: AMA, APA, MLA, NLM, and the
machine-readable formats RIS / MEDLINE / CSL-JSON each have their own
rules for author ordering, date formatting, journal abbreviation,
and punctuation. Re-implementing them from raw article metadata
is a maintenance trap.

This package gives two paths:

1. **HTTP path (`Cite` class)** — delegates to NCBI's Literature
   Citation Exporter (`pmc.ncbi.nlm.nih.gov/api/ctxp/`), which
   renders citations from NCBI's own canonical metadata. Use this
   when you have a PMID or numeric PMC ID and want NCBI's
   authoritative output.
2. **Offline path (`formatCitation` bulk parser)** — renders the
   same four formats locally from a `PubmedArticle` already parsed
   by `@ncbijs/pubmed-xml`. Use this when you've batch-fetched XML
   via E-utilities and want to render citations without per-article
   network round-trips.

The two paths produce **format-compatible but not byte-identical**
output. NCBI's renderer occasionally differs in capitalisation,
trailing punctuation, and DOI placement.

## When to use

- Render a citation from a known PMID / PMC ID with NCBI's
  authoritative formatting (`new Cite().cite(pmid, 'medline')`).
- Pull all four pre-rendered styles (AMA, APA, MLA, NLM) in one
  request via the `'citation'` format.
- Stream citations for a PMID list with built-in 334ms inter-request
  delay (`citeMany`).
- Render citations offline from already-parsed PubMed XML
  (`formatCitation(article, 'ris')`) without network calls.
- Get structured CSL-JSON for downstream Zotero / Mendeley
  integration.

## When NOT to use

| If you want to                                          | Use instead                                              |
| ------------------------------------------------------- | -------------------------------------------------------- |
| Search PubMed for articles by query                     | `@ncbijs/pubmed`                                         |
| Fetch full-text JATS for a PMC article                  | `@ncbijs/pmc`                                            |
| Parse PubMed XML into `PubmedArticle` (input to `formatCitation`) | `@ncbijs/pubmed-xml`                                     |
| Convert a DOI to a PMID before citing                   | `@ncbijs/id-converter`                                   |
| Run any other Entrez E-utility                          | `@ncbijs/eutils`                                         |
| Render citations in a style not on the AMA/APA/MLA/NLM list | A dedicated CSL processor (e.g. `citation-js`) over `CSLData` |

## Exports

| Export             | Kind      | Purpose                                                             |
| ------------------ | --------- | ------------------------------------------------------------------- |
| `Cite`             | class     | HTTP client; `new Cite(config?)`                                    |
| `CiteHttpError`    | class     | Thrown on non-2xx responses; carries `status` + `body`              |
| `formatCitation`   | function  | Pure renderer: `(PubmedArticle, CitationFormat) => string`          |
| `CitationFormat`   | type      | `'ris' \| 'medline' \| 'csl' \| 'citation'`                         |
| `CitationSource`   | type      | `'pubmed' \| 'pmc'`                                                 |
| `CitationStyle`    | interface | `{ orig, format }` — one rendered style                             |
| `CitationData`     | interface | Pre-rendered bundle: `{ id, ama, apa, mla, nlm }`                   |
| `CSLData`          | interface | CSL-JSON shape (subset NCBI emits)                                  |
| `CiteConfig`       | interface | `{ maxRetries? }`                                                   |

## API surface

**Endpoint.** `GET https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/{source}/?format={fmt}&id={id}`
where `{source}` is `pubmed` (default) or `pmc`. Format response Content-Types:
`ris` / `medline` -> `text/plain`; `csl` / `citation` -> `application/json`.

### `new Cite(config?)`

```ts
new Cite({
  maxRetries?: number; // default 3 — exponential backoff with jitter on 429/5xx
})
```

No credentials. The Citation Exporter does not expose an API-key
concept and **runs on a separate quota from E-utilities** — its
3 req/s allowance is independent.

### `cite(id, format, source?)` — overloaded return type

```ts
cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
cite(id: string, format: 'citation', source?: CitationSource): Promise<CitationData>;
cite(id: string, format: 'ris' | 'medline', source?: CitationSource): Promise<string>;
```

```ts
const ris = await cite.cite('33024307', 'ris');
const csl = await cite.cite('33024307', 'csl');                  // CSLData
const bundle = await cite.cite('33024307', 'citation');          // CitationData
const pmcCite = await cite.cite('7886120', 'medline', 'pmc');    // PMC source
```

`source` defaults to `'pubmed'`. For `source: 'pmc'`, pass the
**numeric** PMC ID (`'7886120'`), not the prefixed form
(`'PMC7886120'`).

A 404 is rethrown as `Error('Article not found: <id>')` with the
underlying `CiteHttpError` attached as `cause`. Other HTTP errors
propagate as `CiteHttpError` after retries.

For `'csl'` / `'citation'` the response body is JSON-parsed and
shape-validated (presence of `'type'` / `'id'` respectively); a
malformed body throws `Error('Citation Exporter API returned malformed JSON')`.

### `citeMany(ids, format, source?): AsyncIterableIterator<...>`

Serial iteration with a hard 334ms delay between requests
(`REQUEST_DELAY_MS`) on top of the token-bucket rate limit. The
explicit delay exists because NCBI's CTXP endpoint has been
observed to soft-block parallel callers even within the
3 req/s budget.

```ts
for await (const { id, citation } of cite.citeMany(pmids, 'ris')) {
  // citation is `string | CSLData | CitationData` — narrow by format
}
```

The yielded shape is `{ id, citation: string | CSLData | CitationData }`.
Callers must narrow by the `format` they passed in.

### `formatCitation(article, format): string` — bulk renderer

```ts
import { formatCitation } from '@ncbijs/cite';
import type { PubmedArticle } from '@ncbijs/pubmed-xml';

const ris = formatCitation(article, 'ris');
const medline = formatCitation(article, 'medline');
const cslJson = formatCitation(article, 'csl');     // returns JSON string
const nlmCitation = formatCitation(article, 'citation');
```

| Format       | Output shape                                                     |
| ------------ | ---------------------------------------------------------------- |
| `'ris'`      | RIS tagged text (`TY  - JOUR`, `TI  - ...`, ..., `ER  - `)       |
| `'medline'`  | MEDLINE tagged text (`PMID-`, `AID -`, `TI  -`, ..., `MH  -`, `PT  -`) |
| `'csl'`      | **JSON string** (not a `CSLData` object — call `JSON.parse` if you need the object) |
| `'citation'` | Single NLM-style citation line with PMID/PMCID suffix            |

This is offline — no `Cite` instance, no network, no rate limit.
Output may diverge from NCBI's CTXP renderer in fine details (e.g.
`et al` after 6 vs 3 authors); see "Common pitfalls" below.

### `CiteHttpError`

Extends `HttpRetryError` from `@ncbijs/rate-limiter`. Surfaces the
final status and response body when retries are exhausted. The
`cite()` method intercepts `status === 404` and rethrows as a
plain `Error` for ergonomic handling.

## Configuration

| Field        | Type     | Default | Notes                                       |
| ------------ | -------- | ------- | ------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx |

## Rate limiting & credentials

- **No credentials.** `tool` / `email` / `apiKey` are not accepted
  by the Citation Exporter.
- **3 req/s, per instance**, via a private `TokenBucket`.
- **Independent quota from E-utilities.** The CTXP endpoint sits
  behind a different host (`pmc.ncbi.nlm.nih.gov/api/ctxp`) and
  does not share the per-key bucket with `@ncbijs/eutils`. You can
  run both in parallel without quota interference.
- **`citeMany` adds an explicit 334ms delay** between requests on
  top of the token bucket. This is intentional belt-and-braces
  protection — NCBI has been observed to soft-block bursts that
  *technically* fit the rate limit. Do not parallelise `citeMany`
  across multiple instances.

## Cross-package wiring

- **Imports.** `import { Cite, formatCitation } from '@ncbijs/cite'`.
- **Composes with `@ncbijs/rate-limiter`** for token-bucket-paced
  retries (`fetchWithRetry` + `HttpRetryError`).
- **Composes with `@ncbijs/pubmed-xml`** at compile time — the
  bulk renderer accepts `PubmedArticle`, `Author`, `PartialDate`
  from that package. Type-only import; no runtime cost in HTTP-only
  callers if tree-shaken.
- **Used by `@ncbijs/http-mcp`** — `utility-tools.ts` registers a
  `get-citation` MCP tool over a shared `Cite` instance.
- **Common pairing:** chain `@ncbijs/pubmed` (search) ->
  `@ncbijs/eutils` efetch (XML) -> `@ncbijs/pubmed-xml`
  (parse) -> `formatCitation` (render) for fully offline citation
  rendering after a single batched fetch.

## Common pitfalls

1. **`source: 'pmc'` requires the numeric PMC ID, not `PMC<digits>`.**
   The CTXP endpoint reads the `id` parameter as already
   namespace-scoped to `source`, so the `PMC` prefix is rejected.
   Strip it client-side or run the input through `@ncbijs/id-converter`'s
   `isPMCID` and slice off `'PMC'`.

2. **`'csl'` returns `CSLData` from `Cite.cite()` but a JSON
   *string* from `formatCitation()`.** The HTTP path parses the
   server response; the offline path serialises a locally-built
   object via `JSON.stringify(csl, undefined, 2)`. Code switching
   between paths needs two narrowings — one parsed, one stringified.

3. **Format outputs are not byte-identical between paths.** The
   offline `formatCitation` differs from CTXP in at least:
   - `et al` threshold (offline: > 6 authors; CTXP varies by style).
   - Trailing-period handling (offline always appends a period to
     the title if missing).
   - Date formatting for season-only publications (`2024 Spring`).
   - DOI placement in the NLM citation line.
   Treat the offline path as "compatible" for parsing tools (RIS /
   MEDLINE / CSL-JSON), not as a drop-in for human-facing output
   when CTXP-byte-equivalence matters.

4. **404 surfaces as a plain `Error`, not `CiteHttpError`.** Code
   that does `catch (e) { if (e instanceof CiteHttpError) ... }`
   misses the not-found case. Match on `e.message.startsWith('Article not found:')`
   or use `e.cause` to recover the underlying `CiteHttpError`.

5. **`citeMany` rate limit is serial, not concurrent.** A 1000-PMID
   batch takes at least `1000 * 334ms ≈ 5.5 minutes` independent of
   any concurrency you wrap around it. For higher throughput,
   either cache aggressively or fall back to the offline
   `formatCitation` path after one batched efetch.

6. **CSL-JSON parsing is presence-checked, not schema-validated.**
   `Cite.cite(id, 'csl')` only verifies the response has a `type`
   key. Optional CSL fields (`'container-title'`, `volume`, `DOI`,
   ...) may be absent — the exported `CSLData` interface marks them
   optional, but downstream code must handle `undefined`.

7. **`formatCitation` requires a fully-populated `PubmedArticle`.**
   If `@ncbijs/pubmed-xml` parsed only a partial record (e.g. the
   article had no abstract or no journal volume), the corresponding
   tags are simply omitted from the output. There is no validation
   of "minimum required fields" — empty-ish output for sparse
   input is by design.

## Testing

```bash
pnpm nx run @ncbijs/cite:test
pnpm nx run ncbijs-e2e:e2e -- cite
```

`cite.spec.ts` stubs `fetch`, including the 404 branch and the
malformed-JSON branch. `format-citation.spec.ts` walks the four
formats over inline `PubmedArticle` fixtures and is the sole
guardrail against regressions in the offline renderer. E2E hits
the real CTXP endpoint.

## Files

```
packages/cite/src/
  index.ts                                  # public re-exports
  interfaces/
    cite.interface.ts                       # CitationFormat, CitationData, CSLData, ...
  http/
    cite.ts                                 # Cite class + cite/citeMany overloads
    cite.spec.ts
    cite-client.ts                          # CiteHttpError, fetchText
    cite-client.spec.ts
    schema.ts                               # openapi-typescript output (do not edit by hand)
  bulk-parsers/
    format-citation.ts                      # offline RIS / MEDLINE / CSL / NLM renderer
    format-citation.spec.ts
```
