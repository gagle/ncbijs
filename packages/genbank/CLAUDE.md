---
package: '@ncbijs/genbank'
purpose: 'Zero-dependency parser for the NCBI GenBank flat-file format. Splits multi-record streams, extracts LOCUS metadata, FEATURES + qualifiers, REFERENCEs, and ORIGIN sequence into typed records.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/protein'
  - '@ncbijs/nucleotide'
exports:
  - 'parseGenBank'
  - 'createEmptyGenBankRecord'
  - 'GenBankRecord'
  - 'GenBankLocus'
  - 'GenBankReference'
  - 'GenBankFeature'
  - 'GenBankQualifier'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-03-15'
---

# @ncbijs/genbank

## Purpose

Pure-TypeScript parser for the GenBank flat-file format used by NCBI for
both nucleotide (GenBank) and protein (GenPept) records. Accepts a string
containing one or more records separated by `//` and returns a
`ReadonlyArray<GenBankRecord>` with structured locus, references,
features, qualifiers, and the assembled sequence.

**No HTTP. No I/O. No NCBI-specific URLs or credentials.** This package
is a parser library — it can be used against any GenBank-format text:
`efetch` responses, FTP-downloaded `.gbff`/`.gpff` files, or in-house
exports.

Zero runtime dependencies. The same disciplined boundary as
`@ncbijs/rate-limiter` and `@ncbijs/pipeline` — extractable as a
standalone library with no changes.

## When to use

- Parse a GenPept (protein GenBank) or GenBank (nucleotide) record
  fetched via `@ncbijs/protein`, `@ncbijs/nucleotide`, or `@ncbijs/eutils`
  with `rettype=gp` / `rettype=gb`.
- Bulk-parse FTP archives (e.g., RefSeq `*.gbff.gz`) after streaming and
  decompression — pass each text record (or multi-record blob) to
  `parseGenBank`.
- Need typed access to `LOCUS`, `FEATURES` + qualifiers, or `ORIGIN`
  sequence without the EMBL/JATS overhead.

## When NOT to use

| If you want to                                         | Use instead                                           |
| ------------------------------------------------------ | ----------------------------------------------------- |
| FETCH protein records (and parse them)                 | `@ncbijs/protein` (wraps this parser + EFetch)        |
| FETCH nucleotide records (and parse them)              | `@ncbijs/nucleotide` (wraps this parser + EFetch)     |
| Parse FASTA sequence + header                          | `@ncbijs/fasta`                                       |
| Parse PubMed XML (article records)                     | `@ncbijs/pubmed-xml`                                  |
| Parse PMC JATS XML (full-text articles)                | `@ncbijs/jats`                                        |
| Stream-load multi-GB GenBank archives into a sink      | `@ncbijs/pipeline` + this parser as a `BatchParser`   |

## Exports

| Export                       | Kind      | Purpose                                                          |
| ---------------------------- | --------- | ---------------------------------------------------------------- |
| `parseGenBank`               | function  | `(text: string) => ReadonlyArray<GenBankRecord>`                 |
| `createEmptyGenBankRecord`   | function  | `(accession: string) => GenBankRecord` — empty default record   |
| `GenBankRecord`              | interface | Top-level parsed record                                          |
| `GenBankLocus`               | interface | LOCUS line: name, length, moleculeType, topology, division, date |
| `GenBankReference`           | interface | A REFERENCE block: number, range, authors, title, journal, pubmedId |
| `GenBankFeature`             | interface | A FEATURES entry: key, location, qualifiers                      |
| `GenBankQualifier`           | interface | `{ name, value }` pair from the `/key="value"` syntax            |

## API surface

### `parseGenBank(text: string): ReadonlyArray<GenBankRecord>`

```ts
import { parseGenBank } from '@ncbijs/genbank';

const records = parseGenBank(rawText);   // splits on /\n\/\/\s*\n?/
records[0].locus.name;                   // 'NP_000537'
records[0].locus.length;                 // 393
records[0].locus.moleculeType;           // 'aa' for protein, 'mRNA' / 'DNA' for nucleotide
records[0].features[0].key;              // 'source'
records[0].features[0].qualifiers[0];    // { name: 'organism', value: 'Homo sapiens' }
records[0].sequence;                     // 'meepqsdpsv...'  — concatenated, whitespace stripped
```

Empty / whitespace-only chunks between `//` separators are filtered out;
a trailing `//` does not produce a phantom empty record.

### `createEmptyGenBankRecord(accession: string): GenBankRecord`

Construct a record populated with empty strings, zero length, and empty
arrays — but with `locus.name === accession` and `accession === accession`.
Used by `@ncbijs/protein.fetchGenBank()` as a fallback when EFetch returns
no parseable records.

## Parsing behavior

The parser is hand-rolled (no XML / regex-only DSL); the loop in
`splitSections` recognizes a section header as either:

1. `^([A-Z][A-Z /]+?)\s{2,}(.*)$` — header + inline value, OR
2. `^([A-Z]{2,})\s*$` — bare header (continuation lines follow).

Section-specific helpers handle quirks:

- **`LOCUS`** — token-by-token scan, distinguishing molecule type
  (`aa`/`bp`/`mRNA`/`DNA`/...), topology (`linear`/`circular`),
  GenBank division code (3-letter set: `PRI`/`MAM`/`ROD`/.../`TSA`), and
  date (`DD-MMM-YYYY` regex). Tokens that don't match any pattern fall
  through as moleculeType.
- **`SOURCE`** — first non-blank line is `source`; subsequent lines are
  scanned for the indented `ORGANISM` sub-header. The lines after
  `ORGANISM` form `lineage` (joined by spaces, trailing `.` stripped).
- **`REFERENCE`** — repeating block. The first line is `N (residues A to B)`;
  subsequent indented `AUTHORS`/`TITLE`/`JOURNAL`/`PUBMED` lines are
  flushed into the matching field.
- **`FEATURES`** — a feature header starts at column 6 (`/^\s{5}\S/`); a
  qualifier starts at column 22 with `/`. Multi-line qualifier values are
  concatenated with single-space joiners and the trailing `"` is
  stripped per line.
- **`ORIGIN`** — sequence lines `^\d+\s+(.+)$`; whitespace is removed and
  fragments are concatenated. Leading nucleotides preserve case (lowercase
  for protein per RefSeq convention, lowercase for nucleotide too).

## Cross-package wiring

- **Used by `@ncbijs/protein`** — `Protein.fetchGenBank()` and
  `fetchGenBankBatch()` call `parseGenBank` on EFetch `rettype=gp` text.
  `createEmptyGenBankRecord` is the fallback when the response has no
  records.
- **Used by `@ncbijs/nucleotide`** — analogous wrapper for `rettype=gb`.
- **Composes naturally with `@ncbijs/pipeline`** as a `BatchParser`:
  `(raw) => parseGenBank(raw)`. For multi-GB archives, write a
  `streamParser` that buffers complete `//`-terminated chunks and yields
  records one record at a time.

## Common pitfalls

1. **Adding HTTP / I/O to this package.** This is a pure parser. Never
   import `fetch`, `node:fs`, `@ncbijs/eutils`, or `@ncbijs/rate-limiter`.
   Domain wiring belongs in `@ncbijs/protein` and `@ncbijs/nucleotide`.

2. **Treating `moleculeType` as a closed union.** Real LOCUS lines
   contain `DNA`, `RNA`, `mRNA`, `tRNA`, `rRNA`, `aa`, `cRNA`, etc., plus
   genuine NCBI division codes (`PRI`, `MAM`, ...). The parser distinguishes
   the two only by checking the closed division-code set, then falling
   through to moleculeType. Unknown 3-letter codes will be mis-classified
   as moleculeType. Do not exhaustively-switch on `moleculeType` in
   downstream consumers — treat it as `string`.

3. **`organism` vs `lineage` shadowing.** Both are derived from the
   `SOURCE` block. The first non-blank line of `SOURCE` is `source`;
   the indented `ORGANISM` line is `organism`; *every* subsequent
   non-blank line — including ones that semantically belong to a later
   section if the parser missed the section break — gets appended to
   `lineage`. Malformed input with missing column 1 indentation can
   bleed into the lineage.

4. **`features.location` is a string, not a parsed range.** GenBank
   location strings (`join(complement(1..100), 200..300)`) are richer
   than a `[start, end]` pair. The parser stores them verbatim. Consumers
   that need start/end positions must parse the location string
   themselves.

5. **`qualifiers` value normalization.** Multi-line quoted values are
   joined with a single space; trailing `"` is stripped per source line.
   Translation tables (`/translation="MSV..."`) preserve the joined value
   but include single spaces at line breaks — strip them if you need
   the raw amino-acid string.

6. **`sequence` is verbatim casing.** GenPept records use lowercase
   one-letter codes. If you need uppercase for downstream tools, call
   `.toUpperCase()` yourself; the parser does not normalize.

7. **No section ordering invariants assumed.** The parser stores
   `REFERENCE`s in encounter order via a `SectionMap.getAll('REFERENCE')`,
   so downstream code that depends on `references[0]` being "the
   primary citation" should verify rather than assume.

8. **No streaming.** `parseGenBank(text)` requires the entire input
   string in memory. For multi-GB archives, split on `//` boundaries
   yourself and call `parseGenBank` per chunk, or wire it into
   `@ncbijs/pipeline` with a chunk-buffering stream parser.

## Testing

```bash
pnpm nx run @ncbijs/genbank:test
pnpm nx run @ncbijs/genbank:lint
pnpm nx run @ncbijs/genbank:typecheck
pnpm nx run @ncbijs/genbank:build

pnpm nx run ncbijs-e2e:e2e -- genbank
```

Unit tests in `genbank.spec.ts` use inline string fixtures (real
RefSeq protein and nucleotide records) and exercise:

- multi-record splits via `//`
- the LOCUS token-scanning state machine (with all the edge cases:
  bare division, `aa` vs division collision, missing date)
- `ORIGIN` whitespace stripping + multi-line concatenation
- `REFERENCE` repeating blocks with optional `PUBMED` line
- `FEATURES` continuation lines and unquoted qualifier values
- `createEmptyGenBankRecord` defaults

## Files

```
packages/genbank/src/
  index.ts                                 # public re-exports
  genbank.ts                               # parseGenBank + section helpers
  genbank.spec.ts                          # unit tests with inline fixtures
  interfaces/
    genbank.interface.ts                   # all 5 record interfaces
```
