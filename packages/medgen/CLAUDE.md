---
package: '@ncbijs/medgen'
purpose: 'Typed client for NCBI MedGen medical-genetics concepts — search and fetch concept reports (genes, inheritance modes, clinical features, definitions, OMIM cross-refs) via the E-utilities `medgen` database, plus a bulk parser for the MedGen RRF FTP files.'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
  - '@ncbijs/xml'
used_by: []
exports:
  - 'MedGen'
  - 'MedGenHttpError'
  - 'parseMedGenRrf'
  - 'MedGenConfig'
  - 'MedGenConcept'
  - 'MedGenSearchResult'
  - 'MedGenGene'
  - 'MedGenInheritance'
  - 'MedGenClinicalFeature'
  - 'MedGenDefinition'
  - 'MedGenName'
  - 'MedGenRrfInput'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'docs/package-architecture.md'
last_audited: '2026-03-30'
---

# @ncbijs/medgen

## Purpose

Domain wrapper over the NCBI Entrez `medgen` database — MedGen is NCBI's
controlled vocabulary for human medical genetics, aggregating concepts
from OMIM, GeneReviews, MeSH, HPO, Orphanet, GTR, and SNOMED CT under
unified Concept Unique Identifiers (CUIs, e.g. `C0010674` for Cystic
Fibrosis). Each concept ties together associated genes, modes of
inheritance, clinical features (HPO-typed phenotypes), and sourced
definitions.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'medgen' })` directly) because:

- The `esummary` response embeds an XML blob (`conceptmeta`) inside a
  JSON envelope. Six dedicated parsers (`parseAssociatedGenes`,
  `parseModesOfInheritance`, `parseClinicalFeatures`, `parseOmimIds`,
  `parseDefinitions`, `parseNames`) extract typed fields from it using
  `@ncbijs/xml`.
- The package also exposes an offline bulk path: `parseMedGenRrf`
  reads the official MGCONSO/MGDEF/MGSTY pipe-delimited RRF files from
  the MedGen FTP archive and returns the same `MedGenConcept` shape as
  the HTTP `fetch()` method. HTTP and bulk consumers see identical
  types.

## When to use

- Look up a disorder by name and resolve it to a CUI
  (`'cystic fibrosis'` → `C0010674`).
- Enumerate all phenotypes / clinical features for a disease (HPO IDs
  + CUIs).
- Discover the gene panel associated with a Mendelian disorder.
- Resolve OMIM cross-references for a MedGen concept.
- Bulk-load the entire MedGen vocabulary offline from FTP RRF dumps
  (no network, no rate limits) for indexing or analytics.

## When NOT to use

| If you want to                                       | Use instead                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Fetch the OMIM allelic-variant catalog               | `@ncbijs/omim` (Mendelian disorder catalog with status prefix)               |
| Fetch clinical-variant interpretations               | `@ncbijs/clinvar` (variant-level pathogenicity)                              |
| Look up a gene by symbol or NCBI Gene ID             | `@ncbijs/eutils` (`esearch` / `esummary` on `gene`)                          |
| Find SNPs linked to a phenotype                      | `@ncbijs/snp` (dbSNP)                                                        |
| Browse the HPO term hierarchy directly               | Out of scope — query Human Phenotype Ontology directly                       |
| Find literature for a MedGen concept                 | `@ncbijs/eutils` (`elink` from `medgen` → `pubmed`) or `@ncbijs/pubmed`      |

## Exports

| Export                  | Kind      | Purpose                                                                     |
| ----------------------- | --------- | --------------------------------------------------------------------------- |
| `MedGen`                | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)                      |
| `MedGenHttpError`       | class     | HTTP-level failure (extends `HttpRetryError`)                               |
| `parseMedGenRrf`        | function  | Bulk parser for MGCONSO / MGDEF / MGSTY RRF files                           |
| `MedGenConfig`          | interface | `{ apiKey?, tool?, email?, maxRetries? }`                                   |
| `MedGenConcept`         | interface | Unified concept shape — same for HTTP and bulk paths                        |
| `MedGenSearchResult`    | interface | `{ total, ids }`                                                            |
| `MedGenGene`            | interface | `{ geneId, symbol, chromosome, cytogeneticLocation }`                       |
| `MedGenInheritance`     | interface | `{ name, cui }` — mode of inheritance                                       |
| `MedGenClinicalFeature` | interface | `{ name, hpoId, cui }` — phenotype linked via HPO                           |
| `MedGenDefinition`      | interface | `{ source, text }`                                                          |
| `MedGenName`            | interface | `{ name, source, type }` — alternative names from each source vocabulary    |
| `MedGenRrfInput`        | interface | `{ mgconso, mgdef?, mgsty? }` input to the bulk parser                      |

## API surface

### `new MedGen(config?)`

```ts
new MedGen({
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

Per-instance bucket. Use one `MedGen` per process.

### `search(term, options?): Promise<MedGenSearchResult>`

GETs `esearch.fcgi?db=medgen&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await medgen.search('cystic fibrosis');
r.total; // 25
r.ids;   // ['41393', '346004', ...]

const limited = await medgen.search('cardiomyopathy', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20).

### `fetch(ids): Promise<ReadonlyArray<MedGenConcept>>`

GETs `esummary.fcgi?db=medgen&id=...&retmode=json`. Returns one
`MedGenConcept` per UID, with the embedded `conceptmeta` XML parsed
into typed fields:

```ts
{
  uid: string;                 // numeric MedGen UID
  conceptId: string;           // CUI (e.g. 'C0010674')
  title: string;               // canonical name
  definition: string;          // primary definition text
  semanticType: string;        // e.g. 'Disease or Syndrome'
  associatedGenes: ReadonlyArray<MedGenGene>;
  modesOfInheritance: ReadonlyArray<MedGenInheritance>;
  clinicalFeatures: ReadonlyArray<MedGenClinicalFeature>;
  omimIds: ReadonlyArray<string>;
  definitions: ReadonlyArray<MedGenDefinition>;
  names: ReadonlyArray<MedGenName>;
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<MedGenConcept>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search yields no IDs (no second round-trip).

### `parseMedGenRrf(files): ReadonlyArray<MedGenConcept>`

Pure function. Parses the official MedGen FTP RRF dumps (pipe-delimited
text, UMLS-style format) into the same `MedGenConcept` shape:

```ts
import { readFileSync } from 'node:fs';
import { parseMedGenRrf } from '@ncbijs/medgen';

const concepts = parseMedGenRrf({
  mgconso: readFileSync('MGCONSO.RRF', 'utf-8'), // required
  mgdef:   readFileSync('MGDEF.RRF',   'utf-8'), // optional — definitions
  mgsty:   readFileSync('MGSTY.RRF',   'utf-8'), // optional — semantic types
});
```

`@see https://ftp.ncbi.nlm.nih.gov/pub/medgen/`

Bulk path is **lossy compared to HTTP** — it does not populate
`associatedGenes`, `modesOfInheritance`, `clinicalFeatures`, or
`omimIds`. Those fields are arrays present on `MedGenConcept` but
always empty when produced by the bulk parser.

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
- **Per-instance bucket.** Don't run two `MedGen` instances against
  the same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { MedGen, parseMedGenRrf } from '@ncbijs/medgen'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `MedGenHttpError` extends
  `HttpRetryError`.
- **Composes with `@ncbijs/xml`** — uses `readBlock`, `readTag`,
  `readAllTags`, `readAllTagsWithAttributes`, and
  `readAllBlocksWithAttributes` to parse the embedded `conceptmeta` XML.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose MedGen tools; `@ncbijs/etl` does not register a MedGen
  dataset. If/when MCP tools are added, follow the pattern in
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/medgen-concept.ts`.

## Common pitfalls

1. **`conceptId` vs `uid`.** `uid` is the numeric MedGen UID NCBI
   uses internally; `conceptId` is the UMLS CUI (`C0010674`) that
   downstream tools (HPO, OMIM, Orphanet) actually consume. Always
   index by `conceptId` when joining with external datasets.

2. **Embedded XML in a JSON envelope.** The `esummary` response is
   JSON, but the `conceptmeta` field is itself an XML string. The
   parsers in `medgen.ts` read this XML using `@ncbijs/xml` helpers.
   Do not try to `JSON.parse` `conceptmeta` — it is XML. If a future
   NCBI release switches `conceptmeta` to JSON, every parser must be
   rewritten.

3. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

4. **Bulk parser is intentionally lossy.** `parseMedGenRrf` only
   populates `uid`, `conceptId`, `title`, `definition`, `semanticType`,
   `definitions`, and `names`. `associatedGenes`,
   `modesOfInheritance`, `clinicalFeatures`, and `omimIds` are
   present (typed as arrays) but always empty. This matches what the
   RRF files actually contain — the rest lives in the live API.

5. **MGCONSO preferred-name selection.** `parseMgconso` selects the
   `preferredName` either when the `ispref` field is `'Y'`, or as a
   fallback to the first non-empty name encountered. If a CUI has
   multiple preferred names (rare but possible), the **last** `Y`
   wins. Don't rely on stable ordering across MedGen releases.

6. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/gtr`, `@ncbijs/geo`.

7. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip — you cannot observe a "search succeeded but fetch
   failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/medgen:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- medgen     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/medgen:typecheck
pnpm nx run @ncbijs/medgen:lint
pnpm nx run @ncbijs/medgen:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, all six XML sub-parsers (`parseAssociatedGenes`,
`parseModesOfInheritance`, `parseClinicalFeatures`, `parseOmimIds`,
`parseDefinitions`, `parseNames`), entries with `error` field, and
`searchAndFetch` short-circuit. The bulk parser has its own spec
(`parse-medgen-rrf.spec.ts`) covering MGCONSO-only, MGCONSO + MGDEF,
and full three-file input.

## Files

```
packages/medgen/src/
  index.ts                               # public re-exports
  http/
    medgen.ts                            # MedGen class + esearch/esummary + 6 conceptmeta parsers
    medgen.spec.ts
    medgen-client.ts                     # fetchJson + MedGenHttpError + MedGenClientConfig
    medgen-client.spec.ts
  bulk-parsers/
    parse-medgen-rrf.ts                  # MGCONSO / MGDEF / MGSTY → MedGenConcept[]
    parse-medgen-rrf.spec.ts
  interfaces/
    medgen.interface.ts                  # MedGenConfig, MedGenConcept, MedGenGene,
                                         # MedGenInheritance, MedGenClinicalFeature,
                                         # MedGenDefinition, MedGenName,
                                         # MedGenSearchResult, MedGenRrfInput
```
