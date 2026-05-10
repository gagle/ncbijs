---
package: '@ncbijs/pubchem'
purpose: 'Typed client for the PubChem PUG REST and PUG View APIs — compound / substance / bioassay records, computed properties, synonyms, descriptions, classification, patents, gene & protein cross-references, and full PUG View annotation hierarchies. Plus bulk parsers for the FTP Compound Extras release.'
layout: 'split'
storage_mode: true
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
  - '@ncbijs/etl'
exports:
  - 'PubChem'
  - 'PubChemHttpError'
  - 'StorageModeError'
  - 'parseCompoundExtras'
  - 'parsePubchemLiteratureTsv'
  - 'PubChemConfig'
  - 'CompoundProperty'
  - 'CompoundSynonyms'
  - 'CompoundDescription'
  - 'SubstanceRecord'
  - 'SubstanceSynonyms'
  - 'AssayRecord'
  - 'AssaySummary'
  - 'AnnotationRecord'
  - 'AnnotationSection'
  - 'AnnotationData'
  - 'GeneRecord'
  - 'ProteinRecord'
  - 'ClassificationNode'
  - 'PatentRecord'
  - 'CompoundLiteratureLink'
  - 'CompoundExtrasInput'
  - 'CompoundExtrasProperty'
  - 'DataStorage'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'packages/pubchem/README.md'
last_audited: '2026-04-14'
---

# @ncbijs/pubchem

## Purpose

Typed wrapper over PubChem's two REST surfaces:

1. **PUG REST** (`pubchem.ncbi.nlm.nih.gov/rest/pug`) — compound,
   substance, and bioassay primary records by ID, name, SMILES, or
   InChIKey.
2. **PUG View** (`pubchem.ncbi.nlm.nih.gov/rest/pug_view`) — full
   annotation records (GHS classification, pharmacology, patents,
   compound classification hierarchy).

Plus bulk parsers for the FTP `Compound/Extras/` release
(`CID-SMILES`, `CID-InChI-Key`, `CID-IUPAC`, `CID-PMID`).

Coverage:

1. **Compound properties** — molecular formula, weight, IUPAC name,
   SMILES, InChI, XLogP, TPSA, complexity, atom counts. Uniform
   `COMPOUND_PROPERTIES` set sent on every property fetch.
2. **Lookups** — by CID, name, SMILES, InChIKey; CID list by name.
3. **Substance / Bioassay** — full records by SID / AID, batch
   variants, name lookup.
4. **Annotations** — PUG View hierarchical sections with optional
   `heading` filter.
5. **Cross-references** — gene by Gene ID, gene IDs linked to a CID,
   protein by accession.
6. **Classification & patents** — extracted from PUG View Record sections.
7. **Storage mode** — `PubChem.fromStorage(storage)` reads compound
   properties offline.
8. **Bulk parsing** — `parseCompoundExtras` (combines 3 TSV files
   into unified compound records) and `parsePubchemLiteratureTsv`
   (CID → PMID links).

## When to use

- Looking up a compound's structural properties (formula, weight,
  SMILES, InChI) by name or CID.
- Resolving a chemical name → CIDs (`cidsByName('aspirin')`).
- Pulling full GHS hazard classifications for safety reporting.
- Listing patents that reference a compound.
- Bulk-loading the FTP `Compound/Extras/` files into a local store
  for fast offline `cid → properties` lookup.

## When NOT to use

| Goal                                                  | Use instead                                       |
| ----------------------------------------------------- | ------------------------------------------------- |
| RxNorm-normalised drug identifiers / ingredient sets  | `@ncbijs/rxnorm`                                  |
| FDA structured product labels (SPL)                   | `@ncbijs/dailymed`                                |
| Clinical trials referencing a drug                    | `@ncbijs/clinical-trials`                         |
| Drug → variant pharmacogenomics                       | `@ncbijs/clinvar` + `@ncbijs/litvar`              |
| MeSH compound terms / chemical headings               | `@ncbijs/mesh`                                    |
| Gene → compound bioactivity from BioAssay aggregates  | `@ncbijs/datasets` (genes) + `assayByAid`         |
| Stream the full Compound FTP release                  | `@ncbijs/etl` + `parseCompoundExtras`             |

## Exports

| Export                            | Kind       | Purpose                                                                  |
| --------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `PubChem`                         | class      | Main client; `new PubChem(config?)` or `PubChem.fromStorage()`           |
| `PubChemHttpError`                | class      | Thrown on HTTP failures with `status` + `body`                           |
| `StorageModeError`                | class      | Thrown when an HTTP-only method is called on a storage instance          |
| `PubChemConfig`                   | interface  | `{ maxRetries? }` (no `apiKey` — PubChem is unauthenticated)             |
| `parseCompoundExtras`             | function   | `{ cidSmiles?, cidInchiKey?, cidIupac? }` → `ReadonlyArray<CompoundExtrasProperty>` |
| `parsePubchemLiteratureTsv`       | function   | `CID-PMID` text → `ReadonlyArray<CompoundLiteratureLink>`                |
| `CompoundProperty` / `Substance*` / `Assay*` / `Annotation*` | interfaces | Domain types — see `interfaces/pubchem.interface.ts` |
| `GeneRecord` / `ProteinRecord` / `ClassificationNode` / `PatentRecord` | interfaces | Cross-reference types |
| `CompoundLiteratureLink`          | interface  | `{ cid, pmid, type }` from CID-PMID                                      |
| `CompoundExtrasInput` / `CompoundExtrasProperty` | interfaces | Bulk-parser shapes                                       |
| `DataStorage`                     | interface  | Structural read contract for `fromStorage()`                             |

## API surface

### `new PubChem(config?)` — HTTP mode

```ts
new PubChem({
  maxRetries?: number; // default 3
});
```

PubChem is **unauthenticated** — there is no API key concept. Rate
limit is fixed at 5 req/s.

### `PubChem.fromStorage(storage): PubChem` — storage mode

| Method                | Storage path                              |
| --------------------- | ----------------------------------------- |
| `compoundByCid(cid)`  | `getRecord('compounds', String(cid))`     |

Throws `Error('Compound with CID ${cid} not found in storage')` if
the record is missing (NOT a `StorageModeError`).

ALL other methods throw `StorageModeError` on a storage-backed
instance — `compoundByName`, `compoundByCidBatch`, `compoundBySmiles`,
`compoundByInchiKey`, `cidsByName`, `synonyms`, `description`,
`substance*`, `assay*`, `*Annotations`, `geneByGeneId`, `geneByCid`,
`proteinByAccession`, `compoundClassification`, `compoundPatents`.

### Compound (PUG REST)

| Method                                  | Returns                                |
| --------------------------------------- | -------------------------------------- |
| `compoundByCid(cid)`                    | `CompoundProperty`                     |
| `compoundByName(name)`                  | `CompoundProperty` (HTTP only)         |
| `compoundByCidBatch(cids)`              | `ReadonlyArray<CompoundProperty>` (HTTP only) |
| `compoundBySmiles(smiles)`              | `CompoundProperty` (HTTP only)         |
| `compoundByInchiKey(inchiKey)`          | `CompoundProperty` (HTTP only)         |
| `cidsByName(name)`                      | `ReadonlyArray<number>` (HTTP only)    |
| `synonyms(cid)`                         | `CompoundSynonyms` (HTTP only)         |
| `description(cid)`                      | `CompoundDescription` (HTTP only)      |

The fixed `COMPOUND_PROPERTIES` URL fragment is sent on EVERY property
fetch — 17 fields including `MolecularFormula`, `MolecularWeight`,
`IUPACName`, `CanonicalSMILES`, `IsomericSMILES`, `InChI`, `InChIKey`,
`XLogP`, `ExactMass`, `MonoisotopicMass`, `TPSA`, `Complexity`, atom
counts. Cannot be customised via config.

### Substance & BioAssay (PUG REST)

| Method                                  | Returns                                |
| --------------------------------------- | -------------------------------------- |
| `substanceBySid(sid)`                   | `SubstanceRecord` (HTTP only)          |
| `substanceBySidBatch(sids)`             | `ReadonlyArray<SubstanceRecord>` (HTTP only) |
| `substanceByName(name)`                 | `SubstanceRecord` (HTTP only)          |
| `substanceSynonyms(sid)`                | `SubstanceSynonyms` (HTTP only)        |
| `sidsByName(name)`                      | `ReadonlyArray<number>` (HTTP only)    |
| `assayByAid(aid)`                       | `AssayRecord` (HTTP only)              |
| `assayByAidBatch(aids)`                 | `ReadonlyArray<AssayRecord>` (HTTP only) |
| `assaySummary(aid)`                     | `AssaySummary` (HTTP only) — runs 2 parallel requests for SIDs + CIDs |

### Annotations & cross-references (PUG View / PUG REST)

| Method                                  | Returns                                |
| --------------------------------------- | -------------------------------------- |
| `compoundAnnotations(cid, heading?)`    | `AnnotationRecord` (HTTP only)         |
| `substanceAnnotations(sid, heading?)`   | `AnnotationRecord` (HTTP only)         |
| `assayAnnotations(aid, heading?)`       | `AnnotationRecord` (HTTP only)         |
| `compoundClassification(cid)`           | `ReadonlyArray<ClassificationNode>` (HTTP only) |
| `compoundPatents(cid)`                  | `ReadonlyArray<PatentRecord>` (HTTP only) |
| `geneByGeneId(geneId)`                  | `GeneRecord` (HTTP only)               |
| `geneByCid(cid)`                        | `ReadonlyArray<number>` (HTTP only) — Gene IDs |
| `proteinByAccession(accession)`         | `ProteinRecord` (HTTP only)            |

`compoundAnnotations(cid, heading)` appends `?heading=<encoded>`. The
heading values come from PubChem's TOC (`'GHS Classification'`,
`'Patents'`, `'Pharmacology and Biochemistry'`, etc.) — an unknown
heading returns an empty section list, NOT an error.

### Bulk parsers (pure)

| Function                       | Input                                                                                  | Output                                  |
| ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------- |
| `parseCompoundExtras`          | `{ cidSmiles?, cidInchiKey?, cidIupac? }` from `pubchem/Compound/Extras/`              | `ReadonlyArray<CompoundExtrasProperty>` |
| `parsePubchemLiteratureTsv`    | decompressed `CID-PMID.gz`                                                             | `ReadonlyArray<CompoundLiteratureLink>` |

`parseCompoundExtras` joins on CID across whichever subset of the 3
files is provided; missing fields default to `''`. CIDs that fail
`Number.parseInt` are silently dropped.

`parsePubchemLiteratureTsv` skips lines with cid=0 or pmid=0 after
parsing (i.e. anything that doesn't yield a valid integer pair).

## Configuration

| Field        | Type     | Required | Default | Notes                                                              |
| ------------ | -------- | -------- | ------- | ------------------------------------------------------------------ |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx                       |

There is no `apiKey` field. Rate limit is fixed.

## Rate limiting & credentials

- Token bucket fixed at **5 req/s**, NOT configurable.
- Per-instance, NOT shared across instances or processes.
- No credentials of any kind. PubChem is fully public.
- `PubChemHttpError extends HttpRetryError` from `@ncbijs/rate-limiter`.
- `fetchJson` enforces a JSON content-type check — non-JSON responses
  (e.g. HTML error pages from upstream proxies) throw a generic
  `HttpRetryError` with body `'Expected JSON but received content-type: ...'`
  rather than masquerading as a parse error.

## Storage mode

`PubChem.fromStorage(storage)` accepts any object satisfying the
local `DataStorage` interface (structurally typed — no import from
`@ncbijs/store` required). `ReadableStorage` from `@ncbijs/store`
satisfies it.

Stored dataset:

| Dataset name | Populated by                                          | Read by         |
| ------------ | ----------------------------------------------------- | --------------- |
| `compounds`  | `etl/load('compounds', sink)` → `parseCompoundExtras` | `compoundByCid` |

The stored shape is `CompoundProperty` (NOT `CompoundExtrasProperty`)
— the ETL job is expected to merge `parseCompoundExtras` output into
the full `CompoundProperty` shape (or store partials and accept that
fields like `xLogP`, `tpsa`, `complexity` will be `0`).

`compoundByCid` is the ONLY method with a storage path. Substances,
bioassays, annotations, classifications, patents, gene / protein
cross-references all throw `StorageModeError`.

## Cross-package wiring

- **Imports.** `import { PubChem } from '@ncbijs/pubchem'`. Bulk
  parsers from `@ncbijs/pubchem` directly.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`.
- **Used by `@ncbijs/http-mcp`** — `tools/pubchem-tools.ts` registers
  MCP tools `search-compound`, `drug-lookup`, `search-gene-by-compound`
  on top of the `PubChem` class.
- **Used by `@ncbijs/etl`** — `dataset-registry.ts` references
  `parseCompoundExtras` for the `compounds` ETL job.

## Common pitfalls

1. **`compoundByCid` in storage mode throws `Error`, not
   `StorageModeError`.** When the requested CID is missing from
   storage, the SDK throws a plain `Error('Compound with CID ${cid}
   not found in storage')`. All OTHER missing-method cases throw
   `StorageModeError`. Two distinct error classes for two distinct
   conditions — code that does `if (err instanceof StorageModeError)`
   will miss the not-found case.

2. **Fixed property set on every fetch.** `COMPOUND_PROPERTIES` is a
   constant in `pubchem.ts` (`MolecularFormula,MolecularWeight,...`).
   You cannot ask for a smaller subset to reduce response size, nor
   request properties outside the list (e.g. `Charge`,
   `IsotopeAtomCount`). If you need an unlisted property, use
   `compoundAnnotations(cid)` with the appropriate heading instead.

3. **`canonicalSmiles` falls back through three fields.** The PUG REST
   schema has changed over time; the mapper checks `CanonicalSMILES`
   then `ConnectivitySMILES`, and `isomericSmiles` falls back through
   `IsomericSMILES` → `SMILES` → canonical. A response missing all
   three yields `''` silently.

4. **`fetchJson` enforces JSON content-type.** A 200 response with
   `Content-Type: text/html` (e.g. PubChem returns an HTML error
   page) throws `HttpRetryError`, NOT `PubChemHttpError`. Callers
   distinguishing 4xx from infrastructure errors must catch the
   superclass.

5. **`assaySummary(aid)` issues TWO HTTP calls in parallel.** It hits
   `aid/sids/JSON` AND `aid/cids/JSON`. With a saturated token
   bucket, this halves your effective throughput per call.

6. **`compoundByName` is unauthenticated and case-sensitive in
   sometimes-surprising ways.** PubChem name lookups normalise common
   names but synonyms are case-sensitive on rare entries — for
   reliable lookups, prefer `cidsByName` then `compoundByCid`.

7. **`*Annotations(id, heading)` returns an empty section list, not a
   404, when the heading is unknown.** Wrong-heading typos are silent
   — log `result.sections.length` to detect.

8. **Patent extraction depends on PUG View `ExtraColumns` shape.**
   `mapPatentRecord` reads `extraColumns['Title']` /
   `'Inventor Names'` / `'Assignee Names'`. PUG View occasionally
   changes column names — defaults are `''` / `[]`. Validate against
   live data when bumping a major release.

## Testing

```bash
pnpm nx run @ncbijs/pubchem:test
pnpm nx run ncbijs-e2e:e2e -- pubchem

pnpm nx run @ncbijs/pubchem:typecheck
pnpm nx run @ncbijs/pubchem:lint
pnpm nx run @ncbijs/pubchem:build
```

Unit tests stub `fetch` for HTTP paths (`pubchem.spec.ts` is large —
~55KB with one block per method) and use an in-memory `DataStorage`
mock for storage mode (`pubchem-storage.spec.ts`). Bulk-parser specs
use small inline TSV fixtures.

## Files

```
packages/pubchem/src/
  index.ts                                       # public re-exports
  interfaces/pubchem.interface.ts                # all domain types + StorageModeError
  http/
    pubchem.ts                                   # PubChem class + COMPOUND_PROPERTIES
    pubchem-client.ts                            # fetchJson + PubChemHttpError + content-type guard
    pubchem.spec.ts                              # HTTP-mode unit tests
    pubchem-storage.spec.ts                      # storage-mode unit tests
    pubchem-client.spec.ts
  bulk-parsers/
    parse-compound-extras.ts                     # CID-SMILES + CID-InChI-Key + CID-IUPAC merge
    parse-pubchem-literature-tsv.ts              # CID-PMID
    *.spec.ts
```
