---
package: '@ncbijs/sra'
purpose: 'Typed client for NCBI SRA (Sequence Read Archive) — search and fetch sequencing experiment metadata via the E-utilities `sra` database, with embedded ExpXml / Runs XML parsed into typed objects.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
  - '@ncbijs/xml'
used_by: []
exports:
  - 'Sra'
  - 'SraHttpError'
  - 'SraConfig'
  - 'SraSearchResult'
  - 'SraExperiment'
  - 'SraOrganism'
  - 'SraRun'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-27'
---

# @ncbijs/sra

## Purpose

Thin domain wrapper over E-utilities (`esearch` + `esummary` against
the `sra` database) for NCBI's Sequence Read Archive — the public
repository of high-throughput sequencing data (RNA-seq, WGS, WES,
ChIP-seq, single-cell, …). SRA metadata is organised as
**experiments** (`SRX*`) belonging to **studies** (`SRP*`) drawn from
**samples** (`SRS*`), with one or more **runs** (`SRR*`) holding the
actual reads.

The package exists as a separate domain client — and is the only
flat, eutils-backed package that pulls in `@ncbijs/xml` — because
the SRA esummary response embeds two XML payloads as **strings**
inside JSON:

- `expxml` — experiment descriptor (`<Title>`, `<Experiment acc=…>`,
  `<Platform instrument_model=…>`, `<LIBRARY_*>` blocks, `<Bioproject>`,
  `<Biosample>`).
- `runs` — list of `<Run acc="SRR…" total_spots=… total_bases=…
  is_public=…/>` self-closing elements.

These are pulled apart with `readTag`, `readBlock`, and
`readAllBlocksWithAttributes` from `@ncbijs/xml`, plus a small
attribute regex for cases the structural readers can't handle. The
output is a typed `SraExperiment` with parsed `runs`, `organism`,
and library metadata.

## When to use

- Look up sequencing experiments by organism / tissue / strategy
  (`'RNA-seq Homo sapiens liver'`, `'single-cell mouse brain'`).
- Fetch run accessions (`SRR*`) to drive downstream
  `prefetch` / `fasterq-dump` / cloud-storage workflows.
- Enumerate library strategy / source / selection for a known
  experiment ID.
- Inventory existing public datasets against a tax ID or BioProject.

## When NOT to use

| If you want to                                              | Use instead                                          |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| Download actual sequencing reads (FASTQ / SRA blobs)        | NCBI `sra-tools` (`prefetch`, `fasterq-dump`) — outside the JS ecosystem |
| Look up an assembled / annotated genome                     | `@ncbijs/datasets`                                   |
| Query reference sequences (RefSeq, GenBank, nucleotide)     | `@ncbijs/eutils` (`efetch` on `nuccore` / `protein`) |
| Fetch BioProject or BioSample records directly              | `@ncbijs/eutils` (`esummary` on `bioproject` / `biosample`) |
| Run BLAST against a reference                               | `@ncbijs/blast`                                      |
| Bulk-download SRA metadata TSVs (SRAdb / SRA Run Selector)  | NCBI SRA web UI / SRAdb directly — no package wraps it |

## Exports

| Export             | Kind      | Purpose                                                    |
| ------------------ | --------- | ---------------------------------------------------------- |
| `Sra`              | class     | Main client                                                |
| `SraHttpError`     | class     | HTTP-level failure (extends `HttpRetryError`)              |
| `SraConfig`        | interface | `{ apiKey?, tool?, email?, maxRetries? }`                  |
| `SraSearchResult`  | interface | `{ total, ids }`                                           |
| `SraExperiment`    | interface | Experiment with library metadata, organism, runs           |
| `SraOrganism`      | interface | `{ taxId, scientificName }`                                |
| `SraRun`           | interface | `{ accession, totalSpots, totalBases, isPublic }`          |

## API surface

### `new Sra(config?)`

```ts
new Sra({
  apiKey?: string;     // E-utilities API key (raises rate 3 → 10 req/s)
  tool?: string;       // application name — included in every request
  email?: string;      // contact email — included in every request
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket` whose rate is selected from the
shared E-utilities constants:

- no key → `EUTILS_REQUESTS_PER_SECOND` (3)
- with key → `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` (10)

Per-instance, not shared. Use one `Sra` per process.

### `search(term, options?): Promise<SraSearchResult>`

GETs `esearch.fcgi?db=sra&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await sra.search('RNA-seq Homo sapiens liver');
r.total; // 128
r.ids;   // ['18012345', '18067890', ...]

const limited = await sra.search('single-cell mouse brain', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID
list. Defaults to NCBI's default (typically 20).

### `fetch(ids): Promise<ReadonlyArray<SraExperiment>>`

GETs `esummary.fcgi?db=sra&id=...&retmode=json`, then parses the
embedded `expxml` and `runs` XML strings. Maps each entry into
`SraExperiment`:

```ts
{
  uid: string;                          // numeric UID
  title: string;                        // e.g. 'RNA-seq of human liver tissue'
  experimentAccession: string;          // 'SRX1234567'
  studyAccession: string;               // 'SRP123456'
  sampleAccession: string;              // 'SRS123456'
  organism: SraOrganism;                // { taxId, scientificName }
  platform: string;                     // 'ILLUMINA'
  instrumentModel: string;              // 'Illumina NovaSeq 6000'
  libraryStrategy: string;              // 'RNA-Seq'
  librarySource: string;                // 'TRANSCRIPTOMIC'
  librarySelection: string;             // 'cDNA'
  libraryLayout: string;                // 'PAIRED' | 'SINGLE' | ''
  bioproject: string;                   // 'PRJNA…'
  biosample: string;                    // 'SAMN…'
  runs: ReadonlyArray<SraRun>;          // every <Run/> in the experiment
  createDate: string;                   // top-level field, not from XML
  updateDate: string;
}
```

Empty input → empty output (no HTTP call). Entries that come back
with an `error` field are skipped silently.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<SraExperiment>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search produced no IDs (no second HTTP call is made).

## Configuration

| Field        | Type     | Required | Default | Notes                                                     |
| ------------ | -------- | -------- | ------- | --------------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Raises rate from 3 → 10 req/s (E-utilities tiering)       |
| `tool`       | `string` | no       | —       | NCBI usage policy asks for one — supply when known        |
| `email`      | `string` | no       | —       | Contact for abuse / quota issues                          |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx              |

`appendEUtilsCredentials` adds whichever credentials are present to
every query string.

## Rate limiting & credentials

- **E-utilities tiering applies.** This package shares the
  `EUTILS_REQUESTS_PER_SECOND` and `EUTILS_REQUESTS_PER_SECOND_WITH_KEY`
  constants from `@ncbijs/eutils/config` — currently 3 (no key) / 10
  (with key).
- **Credentials appended to every request.** `tool`, `email`,
  `api_key` ride on the URL via `appendEUtilsCredentials`. Same
  helper used by `@ncbijs/eutils`.
- **Per-instance bucket.** Don't run two `Sra` instances against
  the same key in one process.

## Cross-package wiring

- **Imports.** `import { Sra } from '@ncbijs/sra'`.
- **Composes with `@ncbijs/eutils`.** Imports `EUTILS_BASE_URL`, the
  rate constants, the `EUtilsCredentials` type, and the
  `appendEUtilsCredentials` helper from `@ncbijs/eutils/config` —
  the package's `/config` subpath export. Does **not** instantiate
  the full `EUtils` class.
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `SraHttpError` extends
  `HttpRetryError`.
- **Composes with `@ncbijs/xml`** — uniquely among the flat
  eutils-backed clients, this package depends on `readTag`,
  `readBlock`, and `readAllBlocksWithAttributes` to crack open the
  embedded `expxml` / `runs` strings. If `@ncbijs/xml` adds a real
  attribute reader in the future, replace the local
  `parseAttributeFromTag` regex helper.
- **No internal consumers.** `@ncbijs/http-mcp` does **not** currently
  expose SRA tools; if/when added, the wiring will mirror
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/sra-experiment.ts`.

## Common pitfalls

1. **Embedded XML in JSON is the whole game.** SRA esummary entries
   look JSON-shaped, but `expxml` and `runs` are opaque strings of
   XML. The mapper splits them with `readTag` / `readBlock` /
   `readAllBlocksWithAttributes`. Don't try to treat them as JSON
   objects, and don't assume NCBI keeps the XML schema stable —
   library names like `LIBRARY_STRATEGY` are wire-format and have
   to be matched verbatim.

2. **`libraryLayout` is derived from a self-closing tag name.** The
   `<LIBRARY_LAYOUT>` block contains a single self-closing element
   whose **tag name** carries the value (`<PAIRED/>` or
   `<SINGLE/>`). The local regex extracts that tag name. If NCBI
   ever wraps it in a regular block with attributes the parser will
   silently return `''`.

3. **`parseAttributeFromTag` is a regex, not a real XML reader.**
   It assumes attribute order doesn't matter and that values are
   always double-quoted. It will mis-handle attributes split across
   lines, single-quoted values, or entity-encoded contents.
   `@ncbijs/xml` does not currently expose an attribute reader; if
   that changes, swap this helper for the official one.

4. **Runs come back in a separate `runs` blob.** `runs` is a
   sibling field of `expxml`, not nested inside it.
   `readAllBlocksWithAttributes(runsXml, 'Run')` is what actually
   produces the run list. An experiment with no runs yields
   `runs: []`.

5. **`isPublic` is a string in the XML.** `is_public="true"` /
   `is_public="false"` is compared as a **string** in the parser
   (`run.attributes['is_public'] === 'true'`). A future API change
   to `1`/`0` would silently flip every run to `false`.

6. **Numeric coercion is permissive.** `taxId`, `totalSpots`,
   `totalBases` are coerced via `Number(value) || 0` — non-numeric
   or missing values become `0` rather than throwing. Don't use `0`
   as a meaningful sentinel; an experiment with `totalBases: 0` may
   simply have a malformed run record.

7. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment.

8. **No actual sequence data.** This client returns metadata only.
   Downloading reads (FASTQ, SRA blobs) requires NCBI's `sra-tools`
   (`prefetch`, `fasterq-dump`) or the AWS / GCP S3 mirrors and is
   intentionally outside the scope of any `@ncbijs/*` package.

9. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class when consumers only
   need the SRA client. Don't refactor to `from '@ncbijs/eutils'` —
   it would bloat the bundle.

## Testing

```bash
pnpm nx run @ncbijs/sra:test          # unit
pnpm nx run ncbijs-e2e:e2e -- sra     # E2E (live NCBI)
pnpm nx run @ncbijs/sra:typecheck
pnpm nx run @ncbijs/sra:lint
pnpm nx run @ncbijs/sra:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, full `expxml` parsing (Title, Experiment/Study/Sample acc,
Platform instrument_model, LIBRARY_* fields, LIBRARY_LAYOUT
self-closing tag, Bioproject, Biosample), `runs` block parsing with
multiple `<Run/>` elements, missing fields fall back to `''` / `0`,
entries with `error` field, and `searchAndFetch` short-circuit. The
E2E spec in `e2e/sra.spec.ts` exercises live NCBI with `ncbiApiKey`
from `e2e/test-config.ts`.

## Files

```
packages/sra/src/
  index.ts                       # public re-exports
  sra.ts                         # Sra class + esearch/esummary + expxml/runs parsers
  sra.spec.ts
  sra-client.ts                  # fetchJson + SraHttpError
  sra-client.spec.ts
  interfaces/
    sra.interface.ts             # SraConfig, SraSearchResult, SraExperiment, SraOrganism, SraRun
```
