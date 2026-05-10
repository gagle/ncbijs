---
package: '@ncbijs/structure'
purpose: 'Typed client for NCBI Structure (MMDB / PDB) — search and fetch macromolecular 3D structure records via the E-utilities `structure` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Structure'
  - 'StructureHttpError'
  - 'StructureConfig'
  - 'StructureSearchResult'
  - 'StructureRecord'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-05-02'
---

# @ncbijs/structure

## Purpose

Thin domain wrapper over E-utilities (`esearch` + `esummary` against
the `structure` database) for NCBI's Molecular Modeling Database
(MMDB) — the NCBI mirror of the worldwide Protein Data Bank (wwPDB).
Each record corresponds to a single PDB entry (`1HBB`, `4HHB`, `7CGO`,
…) with crystallographic / cryo-EM / NMR experimental metadata,
chain composition counts, and ligand summaries.

The package exists as a separate domain client (rather than asking
users to call `eutils.esummary({ db: 'structure' })` directly) because:

- The MMDB esummary response is shaped around PDB conventions
  (`pdbacc`, `pdbdescr`, `pdbclass`, `expmethod`, `resolution` as a
  string, `mmdb*date` triplet) and needs a typed mapping into
  camelCase fields.
- It splits residue counts across three modification categories
  (protein / DNA / RNA) and three molecule-type counts
  (proteinMoleculeCount / dnaMoleculeCount / rnaMoleculeCount /
  biopolymerCount / otherMoleculeCount) — flat consumers want
  these as `number`, not strings.
- Higher-level integrations (sequence-to-structure mapping,
  ligand-binding pipelines) want a typed `StructureRecord` keyed by
  PDB accession, not a raw esummary blob.

## When to use

- Look up structures by gene / protein name / ligand
  (`'hemoglobin'`, `'ATP synthase'`, `'aspirin binding'`).
- Fetch experimental metadata (method, resolution, deposit / entry /
  modify dates) for a known PDB accession.
- Enumerate residue / molecule counts for chain-composition
  analysis.
- Cross-reference RefSeq / UniProt sequences to available 3D
  structures (via `@ncbijs/eutils` `elink` from `protein` →
  `structure`).

## When NOT to use

| If you want to                                            | Use instead                                           |
| --------------------------------------------------------- | ----------------------------------------------------- |
| Download the actual `.pdb` / `.cif` coordinate file        | RCSB PDB or PDBe REST APIs directly — not wrapped here |
| Look up a protein sequence by accession                    | `@ncbijs/eutils` (`efetch` on `protein`)              |
| Look up a gene by symbol or NCBI Gene ID                   | `@ncbijs/eutils` (`esearch` on `gene`)                |
| Run a sequence similarity search                           | `@ncbijs/blast`                                       |
| Find literature citations for a structure                  | `@ncbijs/eutils` (`elink` from `structure` → `pubmed`) or `@ncbijs/pubmed` |
| Fetch full chain / residue / atom coordinate data          | RCSB / PDBe / Mol* APIs directly — out of scope       |

## Exports

| Export                    | Kind      | Purpose                                                |
| ------------------------- | --------- | ------------------------------------------------------ |
| `Structure`               | class     | Main client                                            |
| `StructureHttpError`      | class     | HTTP-level failure (extends `HttpRetryError`)          |
| `StructureConfig`         | interface | `{ apiKey?, tool?, email?, maxRetries? }`              |
| `StructureSearchResult`   | interface | `{ total, ids }`                                       |
| `StructureRecord`         | interface | PDB / MMDB record with experimental + composition data |

## API surface

### `new Structure(config?)`

```ts
new Structure({
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

Per-instance, not shared. Use one `Structure` per process.

### `search(term, options?): Promise<StructureSearchResult>`

GETs `esearch.fcgi?db=structure&term=...&retmode=json`. Returns
total match count and the list of UIDs.

```ts
const r = await structure.search('hemoglobin');
r.total; // 1234
r.ids;   // ['12345', '67890', ...]

const limited = await structure.search('aspirin', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID
list. Defaults to NCBI's default (typically 20).

### `fetch(ids): Promise<ReadonlyArray<StructureRecord>>`

GETs `esummary.fcgi?db=structure&id=...&retmode=json`. Maps each
entry into `StructureRecord`:

```ts
{
  uid: string;                                    // numeric MMDB UID
  pdbAccession: string;                           // 'pdbacc' — e.g. '1HBB'
  description: string;                            // 'pdbdescr'
  enzymeClassification: string;                   // 'ec' — EC number, '' if not enzymatic
  resolution: string;                             // string, e.g. '1.80'
  experimentalMethod: string;                     // 'X-Ray Diffraction' | 'Solution NMR' | 'Electron Microscopy' | …
  pdbClass: string;                               // structural classification
  pdbDepositDate: string;                         // YYYY/MM/DD
  mmdbEntryDate: string;
  mmdbModifyDate: string;
  organisms: ReadonlyArray<string>;               // scientific names
  pdbAccessionSynonyms: ReadonlyArray<string>;    // alternative PDB accessions
  ligandCode: string;                             // primary ligand code, '' if none
  ligandCount: number;
  modifiedProteinResidueCount: number;
  modifiedDnaResidueCount: number;
  modifiedRnaResidueCount: number;
  proteinMoleculeCount: number;
  dnaMoleculeCount: number;
  rnaMoleculeCount: number;
  biopolymerCount: number;
  otherMoleculeCount: number;
}
```

Empty input → empty output (no HTTP call). Entries that come back
with an `error` field are skipped silently.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<StructureRecord>>`

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
- **Per-instance bucket.** Don't run two `Structure` instances
  against the same key in one process.

## Cross-package wiring

- **Imports.** `import { Structure } from '@ncbijs/structure'`.
- **Composes with `@ncbijs/eutils`.** Imports `EUTILS_BASE_URL`, the
  rate constants, the `EUtilsCredentials` type, and the
  `appendEUtilsCredentials` helper from `@ncbijs/eutils/config` —
  the package's `/config` subpath export. Does **not** instantiate
  the full `EUtils` class.
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `StructureHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does **not** currently
  expose Structure tools; if/when added, the wiring will mirror
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/structure-search.ts`.

## Common pitfalls

1. **`resolution` is a string, not a number.** NCBI returns
   `'1.80'`, `'2.50'`, or `''` for non-diffraction methods (NMR,
   some cryo-EM). The mapper preserves the raw string. Parse with
   `Number(record.resolution)` if needed and handle `NaN` for
   non-diffraction entries.

2. **`uid` and `pdbAccession` are different identifiers.** `uid` is
   the numeric MMDB UID used by E-utilities (`elink`, `epost`);
   `pdbAccession` is the four-character PDB code (`1HBB`). Cross-
   referencing `protein` → `structure` returns UIDs, not PDB codes.
   Don't conflate them.

3. **Numeric coercion is permissive.** `ligandCount`,
   `modifiedProteinResidueCount`, `modifiedDnaResidueCount`,
   `modifiedRnaResidueCount`, `dnaMoleculeCount`, `rnaMoleculeCount`
   are coerced via `Number(value) || 0` — non-numeric or missing
   values become `0`. `proteinMoleculeCount`, `biopolymerCount`,
   `otherMoleculeCount` come back as `number` already and only
   default to `0` if missing. Don't use `0` as a meaningful sentinel.

4. **`organisms` is a list, not a single value.** Multi-chain
   complexes (antibody / antigen, host / pathogen) report **every**
   organism in `organismlist`. The mapper preserves the full
   array. Don't index `[0]` and assume it's the primary organism —
   the order is provided by NCBI without a documented convention.

5. **`pdbAccessionSynonyms` covers superseded entries.** When a PDB
   entry is replaced or merged, the prior accessions show up here.
   Useful for back-reference; don't treat as duplicates.

6. **`ligandCode` is a single primary code.** A structure with
   multiple ligands reports `ligandCount > 1` but `ligandCode` is a
   single string (typically the most prominent ligand). To
   enumerate all ligands you'd need the full PDB / MMDB record,
   which this client does not fetch.

7. **Date fields use `YYYY/MM/DD` with slashes.** `pdbDepositDate`,
   `mmdbEntryDate`, `mmdbModifyDate` are NCBI's slash format, not
   ISO 8601. Convert before passing to `new Date(...)`.

8. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment.

9. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip.

10. **No coordinate data, no chain-level detail.** This client only
    covers Entrez `structure` summary. The actual `.pdb` / `.cif`
    coordinates, chain residue sequences, and atom records live at
    RCSB / PDBe and are not wrapped by any `@ncbijs/*` package.

11. **`@ncbijs/eutils/config` subpath import.** The client deliberately
    imports from the `/config` subpath, not the package root, to
    avoid pulling in the full `EUtils` class when consumers only
    need the Structure client. Don't refactor to
    `from '@ncbijs/eutils'` — it would bloat the bundle.

## Testing

```bash
pnpm nx run @ncbijs/structure:test          # unit
pnpm nx run ncbijs-e2e:e2e -- structure     # E2E (live NCBI)
pnpm nx run @ncbijs/structure:typecheck
pnpm nx run @ncbijs/structure:lint
pnpm nx run @ncbijs/structure:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, full record mapping (PDB accession, description, EC,
resolution string, experimental method, dates, organism list,
synonym list, ligand code/count, residue / molecule counts),
permissive numeric coercion for missing fields, entries with
`error` field, and `searchAndFetch` short-circuit. The E2E spec in
`e2e/structure.spec.ts` exercises live NCBI with `ncbiApiKey` from
`e2e/test-config.ts`.

## Files

```
packages/structure/src/
  index.ts                           # public re-exports
  structure.ts                       # Structure class + esearch/esummary + record mapper
  structure.spec.ts
  structure-client.ts                # fetchJson + StructureHttpError
  structure-client.spec.ts
  interfaces/
    structure.interface.ts           # StructureConfig, StructureSearchResult, StructureRecord
```
