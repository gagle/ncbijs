---
package: '@ncbijs/cdd'
purpose: 'Typed client for NCBI Conserved Domain Database (CDD) — search and fetch protein domain annotations (accessions, PSSMs, structure representatives, site descriptions) via the E-utilities `cdd` database, plus a bulk parser for the CDD domain list TSV (`cddid.tbl`).'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Cdd'
  - 'CddHttpError'
  - 'parseCddDomains'
  - 'CddConfig'
  - 'CddRecord'
  - 'CddSearchResult'
  - 'ConservedDomain'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'docs/package-architecture.md'
last_audited: '2026-02-22'
---

# @ncbijs/cdd

## Purpose

Domain wrapper over the NCBI Entrez `cdd` database — the Conserved Domain
Database is NCBI's curated collection of protein domain models (PSSMs)
aggregated from CDD itself plus Pfam, SMART, COG, PRK, TIGRFAM, and KOG.
Each domain entry carries an accession (e.g. `cd00024` for `zf-C2H2`), a
short name, a curated abstract describing function, the source database,
the PSSM length, an optional structure representative (PDB), and a list
of functional site descriptions.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'cdd' })` directly) because:

- Each `esummary` entry mixes `string` and `number` types (`pssmlength`,
  `numbersites`) and the mapper coerces them safely to `number`.
- The package also exposes an offline bulk path: `parseCddDomains`
  reads the official `cddid.tbl` pipe-delimited TSV from the CDD FTP
  archive and returns a slimmer `ConservedDomain` shape (the columns
  the file actually carries — no abstract, no sites, no structure
  representative).
- HTTP and bulk consumers see distinct types (`CddRecord` vs
  `ConservedDomain`) because the FTP file is a strict subset of the
  E-utilities response.

## When to use

- Look up a domain family by name (`'zinc finger'`, `'kinase'`).
- Fetch curated abstracts and PSSM metadata for known CDD UIDs.
- Resolve CDD UIDs into accessions like `cd00024` for downstream
  CDD/CDART/RPS-BLAST workflows.
- Bulk-load the entire CDD domain list offline from `cddid.tbl` (no
  network, no rate limits) for indexing or annotation pipelines.

## When NOT to use

| If you want to                                       | Use instead                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Run RPS-BLAST against CDD for a query protein        | `@ncbijs/blast` (sequence similarity search; CDD is a BLAST target db)       |
| Fetch the protein FASTA for a domain hit             | `@ncbijs/protein` (Entrez `protein` database)                                |
| Look up a gene by symbol                             | `@ncbijs/eutils` (`esearch` / `esummary` on `gene`)                          |
| Resolve a 3D structure for a domain                  | `@ncbijs/eutils` (`esummary` on `structure`) — CDD only stores a pointer     |
| Find literature for a CDD entry                      | `@ncbijs/eutils` (`elink` from `cdd` → `pubmed`) or `@ncbijs/pubmed`         |
| Browse the Pfam / SMART hierarchies directly         | Out of scope — query the source databases                                    |

## Exports

| Export             | Kind      | Purpose                                                                |
| ------------------ | --------- | ---------------------------------------------------------------------- |
| `Cdd`              | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)                 |
| `CddHttpError`     | class     | HTTP-level failure (extends `HttpRetryError`)                          |
| `parseCddDomains`  | function  | Bulk parser for `cddid.tbl` and other CDD domain-list TSVs             |
| `CddConfig`        | interface | `{ apiKey?, tool?, email?, maxRetries? }`                              |
| `CddRecord`        | interface | Full HTTP record — accession, abstract, PSSM, sites, status            |
| `CddSearchResult`  | interface | `{ total, ids }`                                                       |
| `ConservedDomain`  | interface | Slim bulk-parser shape — accession, short name, description, length   |

## API surface

### `new Cdd(config?)`

```ts
new Cdd({
  apiKey?: string;     // E-utilities API key — raises rate 3 → 10 req/s
  tool?: string;       // application name — included on every request
  email?: string;      // contact email — included on every request
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket` whose rate is selected from the
shared E-utilities constants:

- no key → `EUTILS_REQUESTS_PER_SECOND` (3)
- with key → `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` (10)

Per-instance bucket. Use one `Cdd` per process.

### `search(term, options?): Promise<CddSearchResult>`

GETs `esearch.fcgi?db=cdd&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await cdd.search('zinc finger');
r.total; // 42
r.ids;   // ['238081', '197663', ...]

const limited = await cdd.search('kinase', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20).

### `fetch(ids): Promise<ReadonlyArray<CddRecord>>`

GETs `esummary.fcgi?db=cdd&id=...&retmode=json`. Returns one
`CddRecord` per UID:

```ts
{
  uid: string;                     // numeric CDD UID
  accession: string;               // 'cd00024', 'pfam00096', 'smart00355', ...
  title: string;                   // short label
  subtitle: string;                // alternate label
  abstract: string;                // curated description
  database: string;                // 'CDD' | 'Pfam' | 'SMART' | 'COG' | ...
  organism: string;
  publicationDate: string;
  entrezDate: string;
  pssmLength: number;
  structureRepresentative: string; // PDB ID or empty
  numberOfSites: number;
  siteDescriptions: ReadonlyArray<string>;
  status: string;
  livePssmId: string;
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<CddRecord>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search yields no IDs (no second round-trip).

### `parseCddDomains(tsv): ReadonlyArray<ConservedDomain>`

Pure function. Parses the official CDD domain list TSV
(`cddid.tbl`) into a slim shape — only the columns the file
carries:

```ts
import { readFileSync } from 'node:fs';
import { parseCddDomains } from '@ncbijs/cdd';

const domains = parseCddDomains(readFileSync('cddid.tbl', 'utf-8'));
domains[0]; // { accession: 'cd00001', shortName: 'CBS', description: '...',
            //   pssmLength: 100, database: 'CDD' }
```

`@see https://ftp.ncbi.nlm.nih.gov/pub/mmdb/cdd/`

Expected columns (tab-separated): `PSSM-Id`, `Accession`,
`Short name`, `Description`, `PSSM-Length`, `Database`. Lines that
are blank, start with `#`, have fewer than 6 fields, or carry an
empty accession are skipped.

## Configuration

| Field        | Type     | Required | Default | Notes                                                 |
| ------------ | -------- | -------- | ------- | ----------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Raises rate 3 → 10 req/s (E-utilities tiering)        |
| `tool`       | `string` | no       | —       | NCBI usage policy — supply when known                 |
| `email`      | `string` | no       | —       | Contact for abuse / quota issues                      |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx          |

Env vars are NOT read by the client itself — pass them in. The E2E
suite reads `NCBI_API_KEY` via `e2e/test-config.ts`.

## Rate limiting & credentials

- **E-utilities tiering applies.** This package shares the
  `EUTILS_REQUESTS_PER_SECOND` and `EUTILS_REQUESTS_PER_SECOND_WITH_KEY`
  constants from `@ncbijs/eutils/config` — currently 3 (no key) / 10
  (with key).
- **Credentials appended to every request.** `tool`, `email`,
  `api_key` ride on the URL via `appendEUtilsCredentials` from the
  `/config` subpath. Same helper used by `@ncbijs/eutils`.
- **Per-instance bucket.** Don't run two `Cdd` instances against the
  same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { Cdd, parseCddDomains } from '@ncbijs/cdd'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `CddHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose CDD tools; `@ncbijs/etl` does not register a CDD dataset.
  If/when MCP tools are added, follow the pattern in
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/cdd-search.ts`.

## Common pitfalls

1. **`CddRecord` and `ConservedDomain` are different types — by
   design.** The HTTP path returns the full `CddRecord` (15 fields
   including curated abstract and site descriptions). The bulk path
   returns the slim `ConservedDomain` (5 fields — accession, short
   name, description, PSSM length, database). The FTP file simply
   does not carry the abstract, sites, or structure representative.
   Do not try to unify them — consumers that need both must branch
   on source.

2. **`pssmlength` and `numbersites` are typed `string | number` in the
   raw response.** The mapper coerces with `Number(raw.pssmlength ?? 0)
   || 0` and `Number(raw.numbersites) || 0`. A value of literal
   `'NaN'` in the response collapses to `0`, not `NaN`. Don't read
   `0` as definitively "no sites" — it may also mean "field absent
   or unparseable".

3. **`accession` is the cross-database identifier, not `uid`.** The
   numeric `uid` is internal to NCBI's `cdd` Entrez database. The
   accession (`cd00024`, `pfam00096`, `smart00355`) is what
   downstream tools (RPS-BLAST, CDD search results, Pfam) actually
   index. Always join external datasets on `accession`, not `uid`.

4. **`database` field tells you the source.** A CDD entry may
   originate from `CDD`, `Pfam`, `SMART`, `COG`, `PRK`, `TIGRFAM`,
   or `KOG`. The accession prefix is a strong hint (`cd*` = CDD,
   `pfam*` = Pfam, `smart*` = SMART) but not authoritative — read
   the `database` field.

5. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

6. **Bulk parser is intentionally lossy.** `parseCddDomains` returns
   only what `cddid.tbl` carries. There is no second bulk file that
   carries abstracts; for those you must use the HTTP path or a
   separate FTP download (out of scope).

7. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/medgen`, `@ncbijs/books`,
   `@ncbijs/nlm-catalog`.

8. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. You cannot observe a "search
   succeeded but fetch failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/cdd:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- cdd     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/cdd:typecheck
pnpm nx run @ncbijs/cdd:lint
pnpm nx run @ncbijs/cdd:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, entries with `error` field, `searchAndFetch` short-circuit,
and the bulk parser against TSV fixtures (header lines, comment
lines, rows with too few columns, empty accession). The bulk parser
has its own spec (`parse-cdd-domains.spec.ts`).

## Files

```
packages/cdd/src/
  index.ts                              # public re-exports
  http/
    cdd.ts                              # Cdd class + esearch/esummary + record mapper
    cdd.spec.ts
    cdd-client.ts                       # fetchJson + CddHttpError + CddClientConfig
    cdd-client.spec.ts
  bulk-parsers/
    parse-cdd-domains.ts                # cddid.tbl → ConservedDomain[]
    parse-cdd-domains.spec.ts
  interfaces/
    cdd.interface.ts                    # CddConfig, CddRecord, CddSearchResult,
                                        # ConservedDomain
```
