---
package: '@ncbijs/fasta'
purpose: 'Zero-dependency FASTA format parser. Pure synchronous function: string in, FastaRecord array out. No HTTP, no I/O, no validation.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/protein'
  - '@ncbijs/nucleotide'
exports:
  - 'parseFasta'
  - 'FastaRecord'
related_docs: []
last_audited: '2026-03-13'
---

# @ncbijs/fasta

## Purpose

Parse [FASTA-formatted](https://en.wikipedia.org/wiki/FASTA_format)
sequence text into typed records. The format is dead-simple — header
line starting with `>`, then one or more lines of sequence data — but
real-world FASTA from NCBI, UniProt, Ensembl, and EBI varies in:

- header style (NCBI `gi|...|ref|...`, UniProt `sp|P12345|GENE_HUMAN`,
  bare accession, free-text descriptions),
- line endings (`\n` vs `\r\n`),
- comment lines (`;` prefix per the original spec),
- blank lines between records,
- multiple records concatenated in one file.

This package handles all of those with one pure function. **Zero
runtime dependencies** — designed to be extractable as a standalone
library if ever needed outside ncbijs.

## When to use

- Parse FASTA text you already have (from `efetch`, FTP, file system,
  user upload).
- As a building block inside higher-level NCBI clients that fetch
  FASTA via HTTP and return typed records.
- Browser or Node — no platform-specific code.

## When NOT to use

| If you want to                                                  | Use instead                                              |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| Fetch FASTA over HTTP (protein accessions)                      | `@ncbijs/protein` (wraps this + EFetch + rate limiter)   |
| Fetch FASTA over HTTP (nucleotide accessions)                   | `@ncbijs/nucleotide` (wraps this + EFetch + rate limiter) |
| Fetch arbitrary FASTA via E-utilities                           | `@ncbijs/eutils.efetch({ rettype: 'fasta' })` then `parseFasta` |
| Parse GenBank flatfile format                                   | `@ncbijs/genbank`                                        |
| Parse FASTQ (sequencing reads with quality)                     | A FASTQ-specific library — this package is FASTA-only    |
| Stream-parse a multi-GB FASTA file                              | Compose this with `@ncbijs/pipeline` and a line-stream split on `>` boundaries (this package is in-memory) |
| Validate sequence alphabet / per-residue checks                 | A bioinformatics validator — this parser does no alphabet checks |

## Exports

| Export        | Kind      | Purpose                                                |
| ------------- | --------- | ------------------------------------------------------ |
| `parseFasta`  | function  | `(text: string) => Array<FastaRecord>` — the parser    |
| `FastaRecord` | interface | `{ id, description, sequence }` — one record per `>`   |

## API surface

### `parseFasta(text): Array<FastaRecord>`

```ts
import { parseFasta } from '@ncbijs/fasta';

const text = `
>NP_000537.3 cellular tumor antigen p53 isoform a [Homo sapiens]
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP
DEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYPQGLNGTVNLPGRNSFEV
`;

const records = parseFasta(text);
records[0].id;          // 'NP_000537.3'
records[0].description; // 'cellular tumor antigen p53 isoform a [Homo sapiens]'
records[0].sequence;    // 'MEEPQSDPSVEPPLSQETFSDLWKLL...' (concatenated)
```

Header line semantics:

- `>` is stripped.
- Everything before the first space → `id`.
- Everything after the first space (trimmed) → `description`.
- A header with no spaces leaves `description = ''`.

Sequence semantics:

- Subsequent non-comment, non-blank lines are trimmed and concatenated.
- Comment lines starting with `;` are skipped (per original FASTA spec).
- Blank lines are skipped.
- No alphabet validation (you can put `XYZ123` in the sequence and it
  passes through unchanged).

Returns an empty array `[]` for empty input. Returns one record per
`>` header. **Never throws** — malformed input produces best-effort
records or an empty array.

### `FastaRecord`

```ts
interface FastaRecord {
  readonly id: string;
  readonly description: string;
  readonly sequence: string;
}
```

All fields are non-optional strings. Missing description → `''`.
Missing sequence → `''`. Never `undefined` / `null`.

## Cross-package wiring

- This package imports nothing from `@ncbijs/*` and has zero runtime
  dependencies. Stays project-agnostic.
- **Used by:**
  - `@ncbijs/protein/src/protein.ts` — `fetchFasta` /
    `fetchFastaBatch` pipe EFetch text through `parseFasta`.
  - `@ncbijs/nucleotide/src/nucleotide.ts` — same pattern, different
    `db=`.
- **Not source-agnostic.** No `fromStorage()` mode — it's a pure
  parser, has no notion of storage. Storage adapters live in the
  HTTP-tier consumers.

## Common pitfalls

1. **No alphabet validation.** `parseFasta` does not check that the
   sequence consists of valid IUPAC nucleotide or amino-acid codes.
   `>foo\nXYZ123\n` returns `{ id: 'foo', description: '', sequence: 'XYZ123' }`
   without complaint. Validate downstream if you care.

2. **Whitespace inside the sequence is stripped per-line.** Each
   sequence line is `.trim()`ed before concatenation, so embedded
   spaces or tabs within a line are *not* preserved. This matches
   NCBI's wrapped output but means you cannot round-trip a FASTA
   that uses spaces meaningfully (none do).

3. **Header parsing is space-delimited only.** The pipe-delimited
   NCBI multi-id form `>gi|12345|ref|NP_000537.3| description` is
   stored verbatim as `id` (`gi|12345|ref|NP_000537.3|`) and the rest
   as `description`. If you need the parsed accession, post-process
   the `id` field — this package doesn't unpack `gi|...|ref|...`.

4. **Comment lines (`;`) are skipped, not stored.** The original 1985
   FASTA spec allowed `;`-prefixed comment lines; modern files rarely
   use them. They are silently dropped — flag this if you need to
   round-trip files that contain comments.

5. **Records with no sequence lines.** `>foo\n>bar\nACGT\n` produces
   two records: `{ id: 'foo', sequence: '' }` and
   `{ id: 'bar', sequence: 'ACGT' }`. Don't filter `sequence === ''`
   blindly — it may be a real header with the data on the wrong side
   of a stream chunk boundary if you wrote your own splitter.

6. **In-memory only.** Calling `parseFasta` on a 5 GB string will
   try to allocate that string. For huge files, slice on
   `\n>` boundaries first (compose with `@ncbijs/pipeline`) and
   call `parseFasta` per record — or use a streaming FASTA library
   from elsewhere.

7. **Return type is `Array<FastaRecord>`, not `ReadonlyArray`.**
   The returned array is mutable. Treat it as readonly by convention
   — the records inside use `readonly` fields on `FastaRecord`, but
   the array container does not.

## Testing

```bash
pnpm nx run @ncbijs/fasta:test
pnpm nx run @ncbijs/fasta:lint
pnpm nx run @ncbijs/fasta:typecheck
pnpm nx run @ncbijs/fasta:build
```

Unit tests in `parse-fasta.spec.ts` use inline string fixtures covering:

- single-record, multi-record inputs
- `\n` and `\r\n` line endings
- comment lines (`;`)
- header-only and sequence-only edge cases
- NCBI / UniProt / bare-accession header styles

There is also `e2e/fasta.spec.ts` which fetches real FASTA from NCBI
EFetch via `@ncbijs/eutils` and pipes it through `parseFasta`,
verifying the parser tolerates current live NCBI output (nucleotide
mRNA, protein, batched multi-record). Run with:

```bash
pnpm nx run ncbijs-e2e:e2e -- fasta
```

## Files

```
packages/fasta/src/
  index.ts                          # public re-exports
  parse-fasta.ts                    # parseFasta (the only function)
  parse-fasta.spec.ts               # unit tests
  interfaces/
    fasta.interface.ts              # FastaRecord
```
