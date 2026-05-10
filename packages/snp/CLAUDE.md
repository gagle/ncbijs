---
package: '@ncbijs/snp'
purpose: 'NCBI dbSNP Variation Services API client (RefSNP reports, allele placements, population frequencies, clinical significance) plus bulk parsers for the FTP RefSNP JSON/NDJSON and dbSNP VCF distributions. Split layout (http + bulk-parsers).'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'Snp'
  - 'SnpHttpError'
  - 'parseRefSnpJson'
  - 'parseRefSnpNdjson'
  - 'parseDbSnpVcf'
  - 'SnpConfig'
  - 'RefSnpReport'
  - 'SnpPlacement'
  - 'SnpAllele'
  - 'SnpAlleleAnnotation'
  - 'SnpFrequency'
  - 'SnpClinicalSignificance'
  - 'HgvsResult'
  - 'SpdiContextual'
  - 'VcfFields'
  - 'DbSnpVcfVariant'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-25'
---

# @ncbijs/snp

## Purpose

Two complementary surfaces over dbSNP:

1. **HTTP client** for the Variation Services REST API at
   `api.ncbi.nlm.nih.gov/variation/v0` — RefSNP reports by `rs` ID,
   plus notation conversion among SPDI, HGVS, and VCF fields.
2. **Bulk parsers** for the NCBI dbSNP FTP release: per-record JSON
   from the RefSNP NDJSON dumps, and tab-delimited VCF lines.

Both surfaces emit the same domain types (`RefSnpReport`,
`SnpPlacement`, `SnpAllele`, …) so HTTP and bulk pipelines can share
downstream code.

## When to use

- Resolve a `rs` ID to its primary chromosomal placement, alleles,
  population frequency, and ClinVar annotations.
- Convert between SPDI ↔ HGVS ↔ VCF fields when bridging tools that
  speak different variant notations.
- Bulk-load the yearly dbSNP NDJSON dumps (e.g. `refsnp-chr1.json.bz2`
  decompressed) for offline analysis without running a server.
- Extract a usable subset of dbSNP VCF (`/snp/latest_release/VCF/`)
  records — chrom, pos, rs, ref, alt + INFO fields `GENEINFO`, `VC`,
  `dbSNPBuildID`.

## When NOT to use

| If you want to                                    | Use instead                                  |
| ------------------------------------------------- | -------------------------------------------- |
| Look up clinical-variant interpretations          | `@ncbijs/clinvar`                            |
| Find variants by gene symbol                      | `@ncbijs/eutils` (`elink` from `gene` → `snp`) |
| Annotate text with variant mentions               | `@ncbijs/pubtator`                           |
| Search the literature for variant evidence        | `@ncbijs/litvar`                             |
| Parse generic VCF (not dbSNP-specific)            | A dedicated VCF library — `parseDbSnpVcf` only extracts dbSNP INFO fields |

## Exports

| Export                       | Kind      | Purpose                                                             |
| ---------------------------- | --------- | ------------------------------------------------------------------- |
| `Snp`                        | class     | HTTP client                                                         |
| `SnpHttpError`               | class     | HTTP-level failure (extends `HttpRetryError`)                       |
| `parseRefSnpJson`            | function  | One JSON record → `RefSnpReport`                                    |
| `parseRefSnpNdjson`          | function  | NDJSON file → `RefSnpReport[]`                                      |
| `parseDbSnpVcf`              | function  | dbSNP VCF text → `DbSnpVcfVariant[]`                                |
| `SnpConfig`                  | interface | `{ apiKey?, maxRetries? }`                                          |
| `RefSnpReport`               | interface | Top-level report `{ refsnpId, createDate, placements, alleleAnnotations }` |
| `SnpPlacement`               | interface | Placement on a reference sequence + assembly                        |
| `SnpAllele`                  | interface | SPDI representation of one allele at a placement                    |
| `SnpAlleleAnnotation`        | interface | `{ frequency, clinical }`                                           |
| `SnpFrequency`               | interface | Per-study population frequency                                      |
| `SnpClinicalSignificance`    | interface | ClinVar significance + disease names + review status                |
| `HgvsResult`                 | interface | `{ hgvs }`                                                          |
| `SpdiContextual`             | interface | Contextual SPDI allele                                              |
| `VcfFields`                  | interface | `{ chrom, pos, ref, alt }`                                          |
| `DbSnpVcfVariant`            | interface | One row of the dbSNP VCF distribution                               |

## API surface

### HTTP — `new Snp(config?)`

```ts
new Snp({
  apiKey?: string;     // recommended — sent as `api-key` header
  maxRetries?: number; // default 3, exponential backoff on 429/5xx
});
```

Constructs a private `TokenBucket` at **5 req/s**, the documented
ceiling for the Variation Services endpoint. Per-instance — do not
spin up multiple instances against the same key.

### `refsnp(rsId: number): Promise<RefSnpReport>`

GET `/refsnp/{rsId}`. Returns the parsed report.

```ts
const report = await snp.refsnp(7412);
report.refsnpId;                       // '7412'
report.placements[0].assemblyName;     // 'GRCh38.p14'
report.placements[0].alleles[0];       // SPDI: { seqId, position, deleted, inserted }
report.alleleAnnotations[0].frequency; // [{ studyName: 'GnomAD', frequency: 0.127, ... }]
```

The mapping filters `placements_with_allele` to entries with
`seq_type === 'refseq_chromosome'` — non-chromosomal placements (e.g.
contigs, alt loci) are dropped silently.

### `refsnpBatch(rsIds): Promise<ReadonlyArray<RefSnpReport>>`

Sequential `refsnp()` calls. Not parallel — the rate limiter would
serialise them anyway, and sequential keeps error reporting simple.

### Notation conversion

| Method               | Endpoint                                               | Returns                       |
| -------------------- | ------------------------------------------------------ | ----------------------------- |
| `spdiToHgvs(spdi)`   | `/spdi/{spdi}/hgvs`                                    | `{ hgvs }`                    |
| `hgvsToSpdi(hgvs)`   | `/hgvs/{hgvs}/contextuals`                             | `SpdiContextual[]`            |
| `vcfToSpdi(c,p,r,a)` | `/vcf/{chrom}/{pos}/{ref}/{alt}/contextuals`           | `SpdiContextual[]`            |
| `spdiToVcfFields(s)` | `/spdi/{spdi}/vcf_fields`                              | `{ chrom, pos, ref, alt }`    |

All four URL-encode each segment. Pass HGVS / SPDI as the canonical
strings the server expects (e.g. `'NC_000001.11:1014042:C:T'`,
`'NC_000001.11:g.1014043C>T'`).

### Bulk parsers — `parseRefSnpJson(json)` / `parseRefSnpNdjson(ndjson)`

Pure functions. `parseRefSnpJson(json)` consumes one JSON object;
`parseRefSnpNdjson(ndjson)` splits on `\n`, skips blank lines, and
delegates per record. Use these on the FTP NDJSON dump
(`refsnp-chr1.json` after decompressing the `.bz2`).

The NDJSON parser **does not** stream — it reads the whole string into
memory. For very large files, decompress and feed lines yourself.

```ts
import { parseRefSnpNdjson } from '@ncbijs/snp';
const reports = parseRefSnpNdjson(await fs.readFile('refsnp-chr1.json', 'utf-8'));
```

### `parseDbSnpVcf(vcf): ReadonlyArray<DbSnpVcfVariant>`

Pure function. Tab-splits each non-header line, decodes columns 0–7
into typed fields, and pulls `GENEINFO`, `VC`, and `dbSNPBuildID` from
the INFO column.

Lines with fewer than 8 fields are skipped silently. Empty / `'.'`
ALT becomes `[]`.

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `apiKey`     | `string` | —       | Sent as `api-key` HTTP header. Optional but recommended. |
| `maxRetries` | `number` | `3`     | Per-request retries on 429 / 5xx (jittered backoff) |

## Rate limiting & credentials

- **5 req/s, fixed.** Hard-coded constant `REQUESTS_PER_SECOND = 5` in
  `http/snp.ts`. The Variation Services endpoint does not honour the
  E-utilities tiering (3 vs 10 req/s) — the API key only authenticates
  you for higher overall daily quota.
- **`api-key` header, not query param.** Different from E-utilities
  (which uses `api_key=` in the query string). The client handles
  this; do not hand-build URLs.
- **One instance per process.** Token bucket is local to the
  instance.

## Cross-package wiring

- **Imports.** `import { Snp, parseDbSnpVcf } from '@ncbijs/snp'`.
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. Same pattern as every other
  HTTP package.
- **Used by `@ncbijs/http-mcp`** — `packages/http-mcp/src/tools/snp-tools.ts`
  exposes `lookup-refsnp`, `lookup-variant`, `convert-ids`,
  `lookup-frequency` as MCP tools. They wire `Snp` methods to typed
  zod schemas for the MCP server.
- **Examples** — `examples/snp-variant.ts`,
  `examples/snp-variant-conversion.ts`,
  `examples/clinvar-snp-analysis.ts` (cross-references with
  ClinVar).

## Common pitfalls

1. **`rsId` is `number`, not `string`.** The HTTP client takes the
   numeric ID without the `rs` prefix: `snp.refsnp(7412)`, not
   `snp.refsnp('rs7412')` or `snp.refsnp('7412')`. The bulk parsers,
   in contrast, surface the raw `rsId` string from the source data
   (typically `'rs7412'` in dbSNP VCF, `'7412'` in RefSNP JSON).

2. **Non-chromosomal placements are dropped.** `mapRefSnpReport`
   filters to `seq_type === 'refseq_chromosome'`. If you need
   placements on contigs, alt loci, or transcript sequences, parse
   the raw response yourself (the mapper is not exported).

3. **`spdiToHgvs` returns `{ hgvs: '' }` on missing data.** Permissive
   mapping — there is no `null` or thrown error if NCBI's response
   structure is unexpected. Check `result.hgvs !== ''` before
   trusting it.

4. **`frequency` is computed, not read.** The package divides
   `allele_count / total_count` itself; if `total_count` is `0` the
   frequency is `0` (not `NaN`). Don't compare to NCBI-published
   frequency values byte-for-byte — floating-point quirks apply.

5. **`refsnpBatch` is sequential.** N rs IDs → N round-trips. At 5
   req/s a thousand-rs batch takes ~200 seconds. For larger
   workloads, prefer the NDJSON bulk dump.

6. **VCF parser silently skips malformed lines.** Lines with fewer
   than 8 tab-separated fields are dropped without throwing. This is
   tolerant by design (header oddities, blank lines), but it also
   means a corrupt file may parse as a smaller set of valid records.
   Compare line counts if you need a guarantee.

7. **`parseRefSnpNdjson` is in-memory.** No streaming. For
   multi-gigabyte chromosome NDJSON files, write your own line
   reader and call `parseRefSnpJson(line)` per line.

8. **Notation conversion endpoints URL-encode segments.** Special
   characters in HGVS (e.g. `>`, `:`) are handled by
   `encodeURIComponent`. Don't pre-encode.

## Testing

```bash
pnpm nx run @ncbijs/snp:test          # unit
pnpm nx run ncbijs-e2e:e2e -- snp     # E2E (live NCBI)
pnpm nx run @ncbijs/snp:typecheck
pnpm nx run @ncbijs/snp:lint
pnpm nx run @ncbijs/snp:build
```

Unit tests stub `fetch`. The bulk parsers have their own spec files
with small inline fixtures (a handful of NDJSON / VCF lines that
exercise each branch — chromosomal vs non-chromosomal placements,
empty `alt`, missing INFO fields, blank lines).

## Files

```
packages/snp/src/
  index.ts                                  # public re-exports
  interfaces/
    snp.interface.ts                        # all domain types (shared)
  http/
    snp.ts                                  # Snp class + raw mappers
    snp.spec.ts
    snp-client.ts                           # fetchJson + SnpHttpError
    snp-client.spec.ts
  bulk-parsers/
    parse-refsnp-json.ts                    # FTP RefSNP JSON / NDJSON
    parse-refsnp-json.spec.ts
    parse-dbsnp-vcf.ts                      # FTP dbSNP VCF
    parse-dbsnp-vcf.spec.ts
```
