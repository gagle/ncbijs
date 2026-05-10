---
package: '@ncbijs/protein'
purpose: 'Typed client for the NCBI Protein database. Fetches sequences via E-utilities EFetch in FASTA or GenPept (GenBank for proteins) format and parses them into typed records.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/fasta'
  - '@ncbijs/genbank'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Protein'
  - 'ProteinHttpError'
  - 'ProteinConfig'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-12'
---

# @ncbijs/protein

## Purpose

A thin wrapper over NCBI E-utilities `efetch.fcgi` (db=protein) that
returns typed records instead of raw strings. Combines:

- `@ncbijs/rate-limiter` for token-bucket throttling + exponential-
  backoff retries on 429/5xx,
- `@ncbijs/fasta` for FASTA parsing (`fetchFasta`/`fetchFastaBatch`),
- `@ncbijs/genbank` for GenPept parsing (`fetchGenBank`/`fetchGenBankBatch`).

Builds the EFetch URL directly using `EUTILS_BASE_URL` from
`@ncbijs/eutils/config` (subpath import) — it does **not** instantiate
an `EUtils` client. This avoids a second token bucket and keeps the
package independent of the full E-utilities surface.

## When to use

- Fetch protein sequences by accession (`NP_*`, `XP_*`, `AAA*`, `P*`,
  RefSeq protein, GenPept, UniProt-mirrored) in either FASTA or
  GenPept format.
- Need typed `FastaRecord` / `GenBankRecord` rather than raw
  `efetch` text.
- Want a single-purpose, narrow API instead of the generic
  `@ncbijs/eutils` client.

## When NOT to use

| If you want to                                          | Use instead                                    |
| ------------------------------------------------------- | ---------------------------------------------- |
| Fetch nucleotide sequences (mRNA, gDNA, RefSeq RNA)     | `@ncbijs/nucleotide`                           |
| Search the protein database (esearch by gene/organism)  | `@ncbijs/eutils` with `db: 'protein'`          |
| Parse a GenBank-format file already on disk             | `@ncbijs/genbank` directly (`parseGenBank`)    |
| Parse a FASTA file already on disk                      | `@ncbijs/fasta` directly (`parseFasta`)        |
| Run a BLAST sequence-similarity search                  | `@ncbijs/blast`                                |
| Fetch raw EFetch text without parsing                   | `@ncbijs/eutils.efetch({ db: 'protein', ... })` |
| Bulk-load the entire RefSeq protein archive into storage | `@ncbijs/etl` + `@ncbijs/pipeline` + `@ncbijs/genbank` |

## Exports

| Export                | Kind      | Purpose                                                  |
| --------------------- | --------- | -------------------------------------------------------- |
| `Protein`             | class     | Main client                                              |
| `ProteinHttpError`    | class     | Thrown on non-2xx EFetch responses; carries `status`+`body` |
| `ProteinConfig`       | interface | Constructor config (`apiKey?`, `maxRetries?`)            |

`ProteinClientConfig` (the `RetryConfig`-based internal shape used by
`fetchText`) is **not** exported — it is an implementation detail of
`protein-client.ts`.

## API surface

### `new Protein(config?)`

```ts
new Protein({
  apiKey?: string;     // raises EUtils rate from 3 → 10 req/s (sent as 'api-key' header)
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket({ requestsPerSecond: EUTILS_REQUESTS_PER_SECOND })`.
Default rate is **3 req/s** (the unkeyed E-utilities limit). Passing
`apiKey` does NOT widen the bucket — see "Rate limiting" below.

### `fetchFasta(accession): Promise<FastaRecord>`

```ts
const record = await protein.fetchFasta('NP_000537.3');
record.id;          // 'NP_000537.3'
record.description; // 'cellular tumor antigen p53 isoform a [Homo sapiens]'
record.sequence;    // 'MEEPQSDPSV...'
```

If EFetch returns nothing parseable, returns
`{ id: accession, description: '', sequence: '' }` — never undefined.

### `fetchFastaBatch(accessions): Promise<ReadonlyArray<FastaRecord>>`

Joins accessions with `,` into a single `id=` parameter. NCBI accepts
many IDs per request; if the URL gets too long the EFetch endpoint
returns 414 — switch to `@ncbijs/eutils.epost()` + `efetch` with
History Server for large batches (this package does not support that).

### `fetchGenBank(accession): Promise<GenBankRecord>`

Fetches `rettype=gp&retmode=text` (GenPept format) and parses with
`parseGenBank`. Falls back to `createEmptyGenBankRecord(accession)` if
parsing yields no records.

### `fetchGenBankBatch(accessions): Promise<ReadonlyArray<GenBankRecord>>`

Comma-joined accessions; same URL-length caveat as `fetchFastaBatch`.

## Configuration

| Field        | Type     | Required | Default | Notes                                                |
| ------------ | -------- | -------- | ------- | ---------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Sent as `api-key` HTTP header. Raises NCBI's quota but NOT this client's local bucket — see pitfalls. |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429/5xx          |

No `tool` / `email` are sent (E-utilities accept them as URL params,
not headers — this client builds raw URLs without them). Heavy users
should switch to `@ncbijs/eutils` for proper credentials hygiene.

## Rate limiting & credentials

- **Local rate**: 3 req/s, hard-coded via `EUTILS_REQUESTS_PER_SECOND`
  from `@ncbijs/eutils/config`. The bucket is per-`Protein` instance,
  not shared with other clients.
- **API key does NOT widen the bucket.** The constructor always builds
  a 3-req/s bucket — `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` is not used.
  The key is sent only as a header so NCBI's *server-side* quota is
  raised; client-side throttling stays at 3 req/s. Heavy users should
  use `@ncbijs/eutils` directly to get the 10-req/s bucket.
- **Header-based auth.** `protein-client.ts` sends `api-key: <value>` as
  a header. NCBI canonically takes `api_key` as a query parameter; the
  header is also accepted but mixing styles across clients is a known
  source of subtle bugs (see pitfalls).
- **Browser-safe.** Uses only `fetch` and standard URL/headers; the
  demo app calls `Protein` from the browser successfully.

## Cross-package wiring

- **Imports.**
  - `import { Protein } from '@ncbijs/protein'`
  - Internal: `import { EUTILS_BASE_URL, EUTILS_REQUESTS_PER_SECOND } from '@ncbijs/eutils/config'`
    — note this is a **subpath import**, NOT the package root.
- **Composes with:**
  - `@ncbijs/rate-limiter` — `TokenBucket`, `fetchWithRetry`,
    `HttpRetryError`, `RetryConfig`. `ProteinHttpError extends HttpRetryError`.
  - `@ncbijs/fasta` — `parseFasta`, `FastaRecord`.
  - `@ncbijs/genbank` — `parseGenBank`, `createEmptyGenBankRecord`,
    `GenBankRecord`.
  - `@ncbijs/eutils/config` — base URL + rate constant only. Does not
    instantiate `EUtils`.
- **Used by:** no other `@ncbijs/*` package consumes it. Sibling to
  `@ncbijs/nucleotide` (same shape, different `db=`).
- **Not source-agnostic.** No `fromStorage()` mode — protein records
  are HTTP-only.

## Common pitfalls

1. **`apiKey` does not raise the local rate limit.** As noted, the
   bucket is `EUTILS_REQUESTS_PER_SECOND` regardless. If you need
   10 req/s, instantiate `@ncbijs/eutils` and call
   `efetch({ db: 'protein', rettype: 'fasta', ... })` yourself, then
   pipe the result through `parseFasta` / `parseGenBank`.

2. **Comma-joined batch URL length.** `fetchFastaBatch(['A1','A2',...])`
   becomes `?id=A1,A2,...`. NCBI's URL limit is around 2 KB; ~150-300
   accessions is the safe ceiling depending on accession width.
   For larger batches, use `@ncbijs/eutils` with `epost` + History
   Server. The client does not auto-switch to POST.

3. **Empty-result coercion.** `fetchFasta` returns
   `{ id: accession, description: '', sequence: '' }` for unparseable
   responses; `fetchGenBank` returns `createEmptyGenBankRecord(accession)`.
   Do not test `record === undefined` — test
   `record.sequence.length > 0` (FASTA) or
   `record.locus.length > 0` (GenBank).

4. **No `tool` / `email` parameters.** Per NCBI usage policy, every
   E-utilities request should identify the calling tool and developer
   email. This package omits them. For production usage with substantial
   request volume, prefer `@ncbijs/eutils` which threads them through.

5. **`rettype` is hard-coded.** `fetchFasta` uses `rettype=fasta`,
   `fetchGenBank` uses `rettype=gp`. Other types (e.g., `fasta_cds_aa`,
   `ipg`) are not exposed. Drop down to `@ncbijs/eutils.efetch()` for
   those.

6. **Header vs query-param api_key.** The header form (`api-key:`) is
   accepted by NCBI but inconsistent with `appendEUtilsCredentials`
   in `@ncbijs/eutils`, which sends `?api_key=`. If you mix `Protein`
   and `EUtils` instances using the same key, the request mixes header
   and query forms — usually fine, but flagged here for debugging.

7. **`description` for header-only FASTA records.** `parseFasta` stores
   the post-id portion of the FASTA header in `description`. Some
   protein records have no description; the field is `''` rather than
   absent.

8. **Subpath import to `@ncbijs/eutils/config`.** This relies on
   `@ncbijs/eutils` exposing the `./config` subpath in its `exports`
   map. Verify after upgrades — a regression in eutils' export map
   would break this package's build silently at import resolution time.

## Testing

```bash
pnpm nx run @ncbijs/protein:test
pnpm nx run @ncbijs/protein:lint
pnpm nx run @ncbijs/protein:typecheck
pnpm nx run @ncbijs/protein:build

pnpm nx run ncbijs-e2e:e2e -- protein
```

Unit tests in `protein.spec.ts` mock `fetch` via `vi.stubGlobal`,
asserting URL construction (`db=protein`, `rettype=fasta|gp`,
`retmode=text`, `id=` URI encoding), the `api-key` header, and the
empty-result fallbacks. E2E lives in `e2e/protein.spec.ts` and hits
the live E-utilities endpoint with `NCBI_API_KEY`.

## Files

```
packages/protein/src/
  index.ts                                 # public re-exports
  protein.ts                               # Protein class
  protein.spec.ts                          # unit tests
  protein-client.ts                        # ProteinHttpError + fetchText
  interfaces/
    protein.interface.ts                   # ProteinConfig
```
