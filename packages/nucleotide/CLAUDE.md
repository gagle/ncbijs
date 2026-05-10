---
package: '@ncbijs/nucleotide'
purpose: 'Typed client for the NCBI Nucleotide database. Fetches DNA/RNA sequences via E-utilities EFetch in FASTA or GenBank format and parses them into typed records.'
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
  - 'Nucleotide'
  - 'NucleotideHttpError'
  - 'NucleotideConfig'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-04'
---

# @ncbijs/nucleotide

## Purpose

A thin wrapper over NCBI E-utilities `efetch.fcgi` (db=nucleotide) that
returns typed records instead of raw strings. Mirror of `@ncbijs/protein`
— same shape, different `db=` and a different default GenBank `rettype`
(`gb` for nucleotide, `gp` for protein). Combines:

- `@ncbijs/rate-limiter` for token-bucket throttling + exponential-
  backoff retries on 429/5xx,
- `@ncbijs/fasta` for FASTA parsing (`fetchFasta` / `fetchFastaBatch`),
- `@ncbijs/genbank` for GenBank parsing (`fetchGenBank` / `fetchGenBankBatch`).

Builds the EFetch URL directly using `EUTILS_BASE_URL` and
`EUTILS_REQUESTS_PER_SECOND` from `@ncbijs/eutils/config` (subpath
import) — it does **not** instantiate an `EUtils` client. This avoids
a second token bucket and keeps the package independent of the full
E-utilities surface.

## When to use

- Fetch nucleotide sequences by accession (`NM_*`, `XM_*`, `NR_*`,
  `NC_*`, `NG_*`, RefSeq RNA/DNA, GenBank nucleotide, contigs, mRNA,
  genomic DNA) in either FASTA or GenBank format.
- Need typed `FastaRecord` / `GenBankRecord` rather than raw `efetch`
  text.
- Want a single-purpose, narrow API instead of the generic
  `@ncbijs/eutils` client.

## When NOT to use

| If you want to                                          | Use instead                                          |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Fetch protein sequences (RefSeq protein, GenPept)       | `@ncbijs/protein`                                    |
| Search the nucleotide database (esearch by gene/organism) | `@ncbijs/eutils` with `db: 'nuccore'`              |
| Parse a GenBank-format file already on disk             | `@ncbijs/genbank` directly (`parseGenBank`)          |
| Parse a FASTA file already on disk                      | `@ncbijs/fasta` directly (`parseFasta`)              |
| Run a BLAST sequence-similarity search                  | `@ncbijs/blast`                                      |
| Fetch raw EFetch text without parsing                   | `@ncbijs/eutils.efetch({ db: 'nuccore', ... })`      |
| Bulk-load full RefSeq nucleotide archive into storage   | `@ncbijs/etl` + `@ncbijs/pipeline` + `@ncbijs/genbank` |

## Exports

| Export                | Kind      | Purpose                                                     |
| --------------------- | --------- | ----------------------------------------------------------- |
| `Nucleotide`          | class     | Main client                                                 |
| `NucleotideHttpError` | class     | Thrown on non-2xx EFetch responses; carries `status`+`body` |
| `NucleotideConfig`    | interface | Constructor config (`apiKey?`, `maxRetries?`)               |

`NucleotideClientConfig` (the `RetryConfig`-based internal shape used by
`fetchText`) is **not** exported — it is an implementation detail of
`nucleotide-client.ts`.

## API surface

### `new Nucleotide(config?)`

```ts
new Nucleotide({
  apiKey?: string;     // sent as 'api-key' header; raises NCBI's server-side quota
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket({ requestsPerSecond: EUTILS_REQUESTS_PER_SECOND })`.
Default rate is **3 req/s** (the unkeyed E-utilities limit). Passing
`apiKey` does NOT widen the bucket — see "Rate limiting" below.

### `fetchFasta(accession): Promise<FastaRecord>`

```ts
const record = await nucleotide.fetchFasta('NM_000546.6');
record.id;          // 'NM_000546.6'
record.description; // 'Homo sapiens tumor protein p53 (TP53), mRNA'
record.sequence;    // 'GATGGGATTG...'
```

If EFetch returns nothing parseable, returns
`{ id: accession, description: '', sequence: '' }` — never undefined.

### `fetchFastaBatch(accessions): Promise<ReadonlyArray<FastaRecord>>`

Joins accessions with `,` into a single `id=` parameter. NCBI accepts
many IDs per request; if the URL gets too long the EFetch endpoint
returns 414 — switch to `@ncbijs/eutils.epost()` + `efetch` with
History Server for large batches (this package does not support that).

### `fetchGenBank(accession): Promise<GenBankRecord>`

Fetches `rettype=gb&retmode=text` (GenBank flatfile format) and parses
with `parseGenBank`. Falls back to
`createEmptyGenBankRecord(accession)` if parsing yields no records.

### `fetchGenBankBatch(accessions): Promise<ReadonlyArray<GenBankRecord>>`

Comma-joined accessions; same URL-length caveat as `fetchFastaBatch`.

## Configuration

| Field        | Type     | Required | Default | Notes                                                                                                |
| ------------ | -------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Sent as `api-key` HTTP header. Raises NCBI's server-side quota but NOT this client's local bucket — see pitfalls. |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429/5xx                                                           |

No `tool` / `email` are sent (E-utilities accept them as URL params,
not headers — this client builds raw URLs without them). Heavy users
should switch to `@ncbijs/eutils` for proper credentials hygiene.

## Rate limiting & credentials

- **Local rate**: 3 req/s, hard-coded via `EUTILS_REQUESTS_PER_SECOND`
  from `@ncbijs/eutils/config`. The bucket is per-`Nucleotide` instance,
  not shared with sibling clients (`@ncbijs/protein` runs its own
  bucket too).
- **API key does NOT widen the bucket.** The constructor always builds
  a 3-req/s bucket — `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` is not
  used. The key is sent only as a header so NCBI's *server-side* quota
  is raised; client-side throttling stays at 3 req/s. Heavy users
  should use `@ncbijs/eutils` directly to get the 10-req/s bucket.
- **Header-based auth.** `nucleotide-client.ts` sends `api-key: <value>`
  as a header. NCBI canonically takes `api_key` as a query parameter;
  the header is also accepted but mixing styles across clients is a
  known source of subtle bugs (see pitfalls).
- **Browser-safe.** Uses only `fetch` and standard URL/headers.

## Cross-package wiring

- **Imports.**
  - `import { Nucleotide } from '@ncbijs/nucleotide'`
  - Internal: `import { EUTILS_BASE_URL, EUTILS_REQUESTS_PER_SECOND } from '@ncbijs/eutils/config'`
    — note this is a **subpath import**, NOT the package root.
- **Composes with:**
  - `@ncbijs/rate-limiter` — `TokenBucket`, `fetchWithRetry`,
    `HttpRetryError`, `RetryConfig`. `NucleotideHttpError extends HttpRetryError`.
  - `@ncbijs/fasta` — `parseFasta`, `FastaRecord`.
  - `@ncbijs/genbank` — `parseGenBank`, `createEmptyGenBankRecord`,
    `GenBankRecord`.
  - `@ncbijs/eutils/config` — base URL + rate constant only. Does not
    instantiate `EUtils`.
- **Used by:** no other `@ncbijs/*` package consumes it. Sibling to
  `@ncbijs/protein` (same shape, different `db=`).
- **Not source-agnostic.** No `fromStorage()` mode — nucleotide
  records are HTTP-only.

## Common pitfalls

1. **`apiKey` does not raise the local rate limit.** As noted, the
   bucket is `EUTILS_REQUESTS_PER_SECOND` regardless. If you need
   10 req/s, instantiate `@ncbijs/eutils` and call
   `efetch({ db: 'nuccore', rettype: 'fasta', ... })` yourself, then
   pipe the result through `parseFasta` / `parseGenBank`.

2. **`db=nucleotide` is the legacy alias.** This client uses
   `db=nucleotide` in the URL. NCBI also accepts `db=nuccore` (and
   redirects internally). If you see drift in returned record types
   versus `nuccore`-named queries, NCBI may have routed differently
   for divisions like EST/GSS — drop down to `@ncbijs/eutils` and pin
   the explicit db.

3. **Comma-joined batch URL length.** `fetchFastaBatch(['A1','A2',...])`
   becomes `?id=A1,A2,...`. NCBI's URL limit is around 2 KB; ~150-300
   accessions is the safe ceiling depending on accession width.
   For larger batches, use `@ncbijs/eutils` with `epost` + History
   Server. The client does not auto-switch to POST.

4. **Empty-result coercion.** `fetchFasta` returns
   `{ id: accession, description: '', sequence: '' }` for unparseable
   responses; `fetchGenBank` returns `createEmptyGenBankRecord(accession)`.
   Do not test `record === undefined` — test
   `record.sequence.length > 0` (FASTA) or
   `record.locus.length > 0` (GenBank).

5. **No `tool` / `email` parameters.** Per NCBI usage policy, every
   E-utilities request should identify the calling tool and developer
   email. This package omits them. For production usage with
   substantial request volume, prefer `@ncbijs/eutils` which threads
   them through.

6. **`rettype` is hard-coded.** `fetchFasta` uses `rettype=fasta`,
   `fetchGenBank` uses `rettype=gb`. Other types (e.g.,
   `fasta_cds_na`, `gbwithparts`, `seqid`) are not exposed. Drop
   down to `@ncbijs/eutils.efetch()` for those.

7. **Header vs query-param api_key.** The header form (`api-key:`) is
   accepted by NCBI but inconsistent with `appendEUtilsCredentials`
   in `@ncbijs/eutils`, which sends `?api_key=`. If you mix
   `Nucleotide` and `EUtils` instances using the same key, the
   request mixes header and query forms — usually fine, but flagged
   here for debugging.

8. **Subpath import to `@ncbijs/eutils/config`.** This relies on
   `@ncbijs/eutils` exposing the `./config` subpath in its `exports`
   map. Verify after upgrades — a regression in eutils' export map
   would break this package's build silently at import resolution time.

## Testing

```bash
pnpm nx run @ncbijs/nucleotide:test
pnpm nx run @ncbijs/nucleotide:lint
pnpm nx run @ncbijs/nucleotide:typecheck
pnpm nx run @ncbijs/nucleotide:build

pnpm nx run ncbijs-e2e:e2e -- nucleotide
```

Unit tests in `nucleotide.spec.ts` mock `fetch` via `vi.stubGlobal`,
asserting URL construction (`db=nucleotide`, `rettype=fasta|gb`,
`retmode=text`, `id=` URI encoding), the `api-key` header, and the
empty-result fallbacks. E2E lives in `e2e/nucleotide.spec.ts` and hits
the live E-utilities endpoint with `NCBI_API_KEY`.

## Files

```
packages/nucleotide/src/
  index.ts                                 # public re-exports
  nucleotide.ts                            # Nucleotide class
  nucleotide.spec.ts                       # unit tests
  nucleotide-client.ts                     # NucleotideHttpError + fetchText
  interfaces/
    nucleotide.interface.ts                # NucleotideConfig
```
