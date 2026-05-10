---
package: '@ncbijs/datasets'
purpose: 'Typed client for the NCBI Datasets API v2 — gene reports, taxonomy, genome assemblies, virus genomes, BioSamples, gene cross-database links — plus bulk parsers for the gene_info / taxdump / gene2pubmed / gene2go / gene_orthologs / gene_history flat files.'
layout: 'split'
storage_mode: true
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
  - '@ncbijs/etl'
exports:
  - 'Datasets'
  - 'DatasetsHttpError'
  - 'StorageModeError'
  - 'parseGeneInfoTsv'
  - 'parseTaxonomyDump'
  - 'parseGene2PubmedTsv'
  - 'parseGene2GoTsv'
  - 'parseGeneOrthologsTsv'
  - 'parseGeneHistoryTsv'
  - 'DatasetsConfig'
  - 'GeneReport'
  - 'GeneOntology'
  - 'GoTerm'
  - 'TaxonomyReport'
  - 'TaxonomyCount'
  - 'GenomeReport'
  - 'GenomeOrganism'
  - 'AssemblyInfo'
  - 'AssemblyStats'
  - 'VirusReport'
  - 'BioSampleReport'
  - 'BioSampleAttribute'
  - 'GeneLink'
  - 'Gene2PubmedLink'
  - 'Gene2GoAnnotation'
  - 'GeneOrtholog'
  - 'GeneHistoryEntry'
  - 'TaxonomyDumpInput'
  - 'DataStorage'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'packages/datasets/README.md'
last_audited: '2026-03-05'
---

# @ncbijs/datasets

## Purpose

Typed wrapper over the NCBI Datasets API v2 — the JSON-only successor
to the Entrez gene/taxonomy/genome endpoints — plus a set of bulk
parsers for the matching flat-file releases under
`https://ftp.ncbi.nlm.nih.gov/gene/DATA/` and
`https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/`.

Coverage:

1. **Gene reports** — symbol, description, GO ontology, transcript /
   protein counts, Swiss-Prot / Ensembl / OMIM cross-references.
2. **Taxonomy** — lineage, children, dataset counts; supports both the
   v2 (`reports[]`) and legacy (`taxonomy_nodes[]`) response shapes.
3. **Genome assemblies** — by accession or by taxon.
4. **Virus genomes** — by accession or by taxon (host, isolate, geo).
5. **BioSamples** — by accession with full attribute lists.
6. **Gene cross-DB links** — external resource URLs per gene.
7. **Bulk parsers** — `gene_info.gz`, `taxdump.tar.gz` (`names.dmp` +
   `nodes.dmp`), `gene2pubmed.gz`, `gene2go.gz`, `gene_orthologs.gz`,
   `gene_history.gz`.
8. **Storage mode** — `Datasets.fromStorage(storage)` reads
   genes / taxonomy from local DuckDB (or any matching `DataStorage`).

## When to use

- Programmatic access to gene metadata, GO annotations, or assembly
  statistics without parsing Entrez XML.
- Resolving gene symbols → NCBI Gene IDs scoped to a taxon.
- Loading the yearly NCBI gene + taxonomy bulk releases into a local
  store (via `@ncbijs/etl`'s `genes` / `taxonomy` jobs).
- Querying gene reports offline from a populated `DataStorage`.

## When NOT to use

| Goal                                                | Use instead                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| Direct Entrez `gene` / `taxonomy` / `nuccore` calls | `@ncbijs/eutils`                                  |
| dbSNP variant lookups                               | `@ncbijs/snp`                                     |
| Clinical-significance variant data                  | `@ncbijs/clinvar`                                 |
| BLAST sequence search against assemblies            | `@ncbijs/blast`                                   |
| FASTA sequence streaming                            | `@ncbijs/fasta`                                   |
| Bulk-load PubMed baseline                           | `@ncbijs/etl` + `@ncbijs/pubmed`                  |

## Exports

| Export                       | Kind       | Purpose                                                                |
| ---------------------------- | ---------- | ---------------------------------------------------------------------- |
| `Datasets`                   | class      | Main client; `new Datasets(config?)` or `Datasets.fromStorage()`       |
| `DatasetsHttpError`          | class      | Thrown on HTTP-level failures with `status` + `body`                   |
| `StorageModeError`           | class      | Thrown when an HTTP-only method is called on a storage instance        |
| `DatasetsConfig`             | interface  | `{ apiKey?, maxRetries? }`                                             |
| `parseGeneInfoTsv`           | function   | `gene_info.gz` (decompressed) → `ReadonlyArray<GeneReport>`            |
| `parseTaxonomyDump`          | function   | `{ namesDmp, nodesDmp }` → `ReadonlyArray<TaxonomyReport>`             |
| `parseGene2PubmedTsv`        | function   | `gene2pubmed.gz` → `ReadonlyArray<Gene2PubmedLink>`                    |
| `parseGene2GoTsv`            | function   | `gene2go.gz` → `ReadonlyArray<Gene2GoAnnotation>`                      |
| `parseGeneOrthologsTsv`      | function   | `gene_orthologs.gz` → `ReadonlyArray<GeneOrtholog>`                    |
| `parseGeneHistoryTsv`        | function   | `gene_history.gz` → `ReadonlyArray<GeneHistoryEntry>`                  |
| `GeneReport` … `BioSampleReport` | interfaces | Domain types — see `interfaces/datasets.interface.ts`              |
| `TaxonomyDumpInput`          | interface  | `{ namesDmp, nodesDmp }` — input to `parseTaxonomyDump`                |
| `DataStorage`                | interface  | Structural read contract for `fromStorage()`                           |

## API surface

### `new Datasets(config?)` — HTTP mode

```ts
new Datasets({
  apiKey?: string;     // raises rate from 5 → 10 req/s
  maxRetries?: number; // default 3
});
```

No `tool` / `email` required — Datasets v2 does not use E-utility
credentials. The client constructs a private `TokenBucket` sized to
`5` (or `10` with key) requests/second.

### `Datasets.fromStorage(storage): Datasets` — storage mode

Backs the instance with `DataStorage`. Subset of methods supported:

| Method                | Storage path                                          |
| --------------------- | ----------------------------------------------------- |
| `geneById(ids)`       | `getRecord('genes', String(geneId))`                  |
| `geneBySymbol(s, t)`  | `searchRecords('genes', { field: 'symbol', op: 'eq' })` (taxon argument is ignored in storage mode) |
| `taxonomy([id])`      | `getRecord('taxonomy', String(taxId))`                |
| `taxonomy(['name'])`  | `searchRecords('taxonomy', { field: 'organismName', op: 'contains' })` |

All other methods (`genomeBy*`, `virusBy*`, `biosample`, `geneLinks`)
throw `StorageModeError`.

### Gene methods

| Method                            | Returns                              |
| --------------------------------- | ------------------------------------ |
| `geneById(ids: number[])`         | `ReadonlyArray<GeneReport>`          |
| `geneBySymbol(symbols, taxon)`    | `ReadonlyArray<GeneReport>`          |
| `geneLinks(ids: number[])`        | `ReadonlyArray<GeneLink>` (HTTP only) |

Empty `ids` / `symbols` arrays throw a synchronous `Error` —
`geneIds must not be empty` / `symbols must not be empty`.

### Taxonomy

| Method                                | Returns                       |
| ------------------------------------- | ----------------------------- |
| `taxonomy(taxons: (number\|string)[])` | `ReadonlyArray<TaxonomyReport>` |

Accepts mixed `number` (tax ID) and `string` (organism name) inputs.
The HTTP response is auto-detected: v2 (`reports[]`) is preferred,
legacy (`taxonomy_nodes[]`) is the fallback.

### Genome / virus / biosample (HTTP only)

| Method                                  | Returns                       |
| --------------------------------------- | ----------------------------- |
| `genomeByAccession(accessions)`         | `ReadonlyArray<GenomeReport>` |
| `genomeByTaxon(taxon)`                  | `ReadonlyArray<GenomeReport>` |
| `virusByAccession(accessions)`          | `ReadonlyArray<VirusReport>`  |
| `virusByTaxon(taxon)`                   | `ReadonlyArray<VirusReport>`  |
| `biosample(accessions)`                 | `ReadonlyArray<BioSampleReport>` |

All throw `StorageModeError` from a storage-backed instance.

### Bulk parsers (pure, no HTTP, no storage)

| Function                  | Input                                                | Output                              |
| ------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `parseGeneInfoTsv`        | decompressed `gene_info.gz` text                     | `ReadonlyArray<GeneReport>`         |
| `parseTaxonomyDump`       | `{ namesDmp, nodesDmp }` from `taxdump.tar.gz`       | `ReadonlyArray<TaxonomyReport>`     |
| `parseGene2PubmedTsv`     | decompressed `gene2pubmed.gz`                        | `ReadonlyArray<Gene2PubmedLink>`    |
| `parseGene2GoTsv`         | decompressed `gene2go.gz`                            | `ReadonlyArray<Gene2GoAnnotation>`  |
| `parseGeneOrthologsTsv`   | decompressed `gene_orthologs.gz`                     | `ReadonlyArray<GeneOrtholog>`       |
| `parseGeneHistoryTsv`     | decompressed `gene_history.gz`                       | `ReadonlyArray<GeneHistoryEntry>`   |

Parsers detect headers from the first line, skip blanks and `#` comments,
and never throw on malformed rows — invalid rows are silently dropped.

## Configuration

| Field        | Type     | Required | Default | Notes                                                              |
| ------------ | -------- | -------- | ------- | ------------------------------------------------------------------ |
| `apiKey`     | `string` | no       | —       | Sent as `api-key` HTTP header. Raises rate from 5 → 10 req/s.      |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx                       |

Datasets v2 does **not** require `tool` / `email` credentials (unlike
E-utilities). The API key is the only auth concept.

## Rate limiting & credentials

- Token bucket per instance: `5` req/s default, `10` req/s with key.
- Per-instance, NOT shared across instances or processes — spinning up
  multiple `Datasets` instances with the same API key WILL exceed the
  rate limit.
- API key is sent via the `api-key` HTTP header (NOT a query string
  parameter as with E-utilities).
- `DatasetsHttpError` extends `HttpRetryError` from `@ncbijs/rate-limiter`.

## Storage mode

`Datasets.fromStorage(storage)` accepts any object satisfying the
local `DataStorage` interface (structurally typed — no import from
`@ncbijs/store` required). `ReadableStorage` from `@ncbijs/store`
satisfies it.

Stored datasets:

| Dataset name (in storage) | Populated by                         | Read by                                  |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| `genes`                   | `etl/load('genes', sink)` → `parseGeneInfoTsv` | `geneById`, `geneBySymbol` |
| `taxonomy`                | `etl/load('taxonomy', sink)` → `parseTaxonomyDump` | `taxonomy` |

Genome / virus / biosample data are NOT covered by ETL — those methods
throw `StorageModeError`.

## Cross-package wiring

- **Imports.** `import { Datasets } from '@ncbijs/datasets'`. Bulk
  parsers from `@ncbijs/datasets` directly.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket` powers the
  rate limit; `HttpRetryError` is the error superclass.
- **Used by `@ncbijs/http-mcp`** — `tools/datasets-tools.ts` registers
  MCP tools `find-entity`, `lookup-taxonomy`, `search-genome` on top
  of the `Datasets` class. The MCP layer instantiates a single shared
  `Datasets` client.
- **Used by `@ncbijs/etl`** — `dataset-registry.ts` references
  `parseGeneInfoTsv` and `parseTaxonomyDump` to wire the `genes` and
  `taxonomy` ETL jobs into a `Source → Parse → Sink` pipeline.

## Common pitfalls

1. **Empty input arrays throw synchronously.** `geneById([])`,
   `geneBySymbol([], 'human')`, `taxonomy([])`, `geneLinks([])`,
   `genomeByAccession([])`, `virusByAccession([])`, `biosample([])` all
   throw `Error('... must not be empty')` *synchronously* before the
   await point — wrap in try/catch or guard upstream.

2. **`geneBySymbol(symbols, taxon)` ignores `taxon` in storage mode.**
   In HTTP mode the taxon parameter scopes the search; in storage mode
   the implementation does an `eq` symbol search across the whole
   `genes` dataset. Filter post-hoc by `report.taxId` if you need
   taxon-scoped results offline.

3. **Taxonomy response shape duality.** Some queries return
   `reports[]` (v2 schema, normalized by `mapTaxonomyReportV2`),
   others fall back to `taxonomy_nodes[]` (legacy, normalized by
   `mapTaxonomyReportLegacy`). Both are flattened into the same
   `TaxonomyReport`. If a field is missing, suspect the legacy path —
   the `counts.type` enum strips `COUNT_TYPE_` prefix only on v2.

4. **Storage-mode `taxonomy([number])` uses exact match;
   `taxonomy(['name'])` uses `contains`.** A query for the string
   `'9606'` (as opposed to the number `9606`) will run a `contains`
   search on `organismName` — wrong result. Pass tax IDs as `number`,
   organism names as `string`.

5. **`gene.type` is normalized to lowercase + dashes.** The wire
   format uses values like `PROTEIN_CODING`; the SDK reports
   `'protein-coding'`. Matching on the raw enum will fail.

6. **`API key as header, not query string.** Cargo-culting
   E-utilities credential code (`appendEUtilsCredentials`) into
   Datasets calls will silently send the key as `api_key` query
   parameter — it is ignored by Datasets v2 and the rate limit stays
   at 5 req/s. The Datasets client wires the header automatically;
   pass the key via `DatasetsConfig`.

7. **Bulk parsers are pure but order-sensitive on input.**
   `parseTaxonomyDump` requires BOTH `namesDmp` and `nodesDmp` from
   the same `taxdump.tar.gz` release — mixing years yields
   inconsistent lineage / children maps.

## Testing

```bash
pnpm nx run @ncbijs/datasets:test
pnpm nx run ncbijs-e2e:e2e -- datasets

pnpm nx run @ncbijs/datasets:typecheck
pnpm nx run @ncbijs/datasets:lint
pnpm nx run @ncbijs/datasets:build
```

Unit tests stub `fetch` for HTTP paths and use an in-memory
`DataStorage` mock for storage-mode paths
(`datasets-storage.spec.ts`). Bulk-parser specs use small inline TSV
fixtures.

## Files

```
packages/datasets/src/
  index.ts                                       # public re-exports
  interfaces/datasets.interface.ts               # all domain types + StorageModeError
  http/
    datasets.ts                                  # Datasets class
    datasets-client.ts                           # fetchJson + DatasetsHttpError
    datasets.spec.ts                             # HTTP-mode unit tests
    datasets-storage.spec.ts                     # storage-mode unit tests
    datasets-client.spec.ts
  bulk-parsers/
    parse-gene-info-tsv.ts                       # gene_info.gz
    parse-taxonomy-dump.ts                       # names.dmp + nodes.dmp
    parse-gene2pubmed-tsv.ts                     # gene2pubmed.gz
    parse-gene2go-tsv.ts                         # gene2go.gz
    parse-gene-orthologs-tsv.ts                  # gene_orthologs.gz
    parse-gene-history-tsv.ts                    # gene_history.gz
    *.spec.ts                                    # one spec per parser
```
