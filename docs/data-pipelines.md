# Data Pipelines Roadmap

How ncbijs processes NCBI bulk downloads into local storage using composable data pipelines.

## Current state

6 packages are already pure computation with zero HTTP:

| Package                | Bulk functions                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@ncbijs/fasta`        | `parseFasta()`                                                                                               |
| `@ncbijs/xml`          | All functions (readTag, readBlock, etc.)                                                                     |
| `@ncbijs/pubmed-xml`   | `parsePubmedXml()`, `createPubmedXmlStream()`, `parseMedlineText()`                                          |
| `@ncbijs/jats`         | `parseJATS()`, `toMarkdown()`, `toPlainText()`, `toChunks()`                                                 |
| `@ncbijs/rate-limiter` | `TokenBucket` (utility)                                                                                      |
| `@ncbijs/mesh`         | `lookup()`, `expand()`, `ancestors()`, `children()`, `treePath()`, `toQuery()` (when constructor given data) |

## Design principle

Every HTTP method in ncbijs follows the same pattern:

```
fetch(url) -> raw response (JSON/XML/TSV) -> map to typed interface
```

The mapping step is already pure computation. The bulk parser feature exports the mappers so users can feed them local data. No breaking changes. No new classes. No data provider abstraction. Purely additive exports alongside existing HTTP methods.

## NCBI downloadable data inventory

| Dataset          | FTP path                             | Format   | Compressed size | Records          | Update frequency |
| ---------------- | ------------------------------------ | -------- | --------------- | ---------------- | ---------------- |
| PubMed baseline  | `/pubmed/baseline/`                  | XML.gz   | ~35 GB          | 37M+ articles    | Annual + daily   |
| MeSH descriptors | `nlmpubs.nlm.nih.gov/projects/mesh/` | XML      | ~360 MB         | 30K descriptors  | Annual           |
| PubTator3        | `/pub/lu/PubTator3/`                 | TSV.gz   | ~12 GB          | 1B+ annotations  | Weekly           |
| ClinVar          | `/pub/clinvar/tab_delimited/`        | TSV.gz   | ~150 MB         | 2.5M submissions | Weekly           |
| dbSNP            | `/snp/latest_release/JSON/`          | JSON.bz2 | ~200 GB         | 1B+ refSNPs      | Annual           |
| PubChem Extras   | `/pubchem/Compound/Extras/`          | TSV      | ~15 GB          | 115M+ compounds  | Weekly           |
| Gene info        | `/gene/DATA/gene_info.gz`            | TSV      | ~600 MB         | 35M+ genes       | Daily            |
| Taxonomy dump    | `/pub/taxonomy/taxdump.tar.gz`       | TSV      | ~80 MB          | 2.5M+ taxa       | Daily            |
| PMC OA subset    | `/pub/pmc/oa_bulk/`                  | JATS XML | ~700 GB         | ~5M articles     | Daily            |
| PMC ID mapping   | `/pub/pmc/PMC-ids.csv.gz`            | CSV      | ~233 MB         | 9.5M mappings    | Regular          |
| BLAST databases  | `/blast/db/`                         | Binary   | ~700 GB-1 TB    | nr, nt, etc.     | Daily            |

For the **exhaustive inventory** covering all 11 tiers (~2.5 TB RAG-relevant, ~15+ TB total, ~60+ PB including SRA), see [pipeline-architecture.md](./pipeline-architecture.md).

All data is public domain (U.S. government work) except PMC articles which carry per-article Creative Commons licenses. PMC legacy FTP was deprecated April 2026 — use AWS S3 (`pmc-oa-opendata` bucket) instead.

## Per-package additions

### mesh

**New export:** `parseMeshDescriptorXml(xml: string): MeshTreeData`

```typescript
import { MeSH, parseMeshDescriptorXml } from '@ncbijs/mesh';

const xml = fs.readFileSync('desc2025.xml', 'utf-8');
const treeData = parseMeshDescriptorXml(xml);
const mesh = new MeSH(treeData);
mesh.expand('Asthma'); // fully local
```

**Source:** `https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml` (~360 MB)
**Output:** ~2 MB MeshTreeData JSON (30K descriptors with tree numbers and qualifiers)
**New files:** `parse-mesh-descriptor-xml.ts` + spec
**Replaces:** `sparql()`, `lookupOnline()`

### id-converter

**New export:** `parsePmcIdsCsv(csv: string): ReadonlyArray<ConvertedId>`

```typescript
import { parsePmcIdsCsv } from '@ncbijs/id-converter';

const csv = fs.readFileSync('PMC-ids.csv', 'utf-8');
const ids = parsePmcIdsCsv(csv);
```

**Source:** `https://ftp.ncbi.nlm.nih.gov/pub/pmc/PMC-ids.csv.gz` (~100 MB)
**Records:** 9.5M PMID/PMCID/DOI mappings
**New files:** `parse-pmc-ids-csv.ts` + spec
**Replaces:** `convert()`

### clinvar

**New export:** `parseVariantSummaryTsv(tsv: string): ReadonlyArray<VariantReport>`

```typescript
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';

const tsv = fs.readFileSync('variant_summary.txt', 'utf-8');
const variants = parseVariantSummaryTsv(tsv);
```

**Source:** `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz` (~150 MB)
**Records:** ~2.5M variant submissions
**New files:** `parse-variant-summary-tsv.ts` + spec
**Replaces:** `search()`, `fetch()`, `searchAndFetch()`

### datasets

**New exports:**

```typescript
import { parseGeneInfoTsv, parseTaxonomyDump } from '@ncbijs/datasets';

const genes = parseGeneInfoTsv(fs.readFileSync('gene_info', 'utf-8'));
const taxa = parseTaxonomyDump({
  names: fs.readFileSync('names.dmp', 'utf-8'),
  nodes: fs.readFileSync('nodes.dmp', 'utf-8'),
});
```

**Sources:**

- Gene: `https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz` (~600 MB, 35M genes)
- Taxonomy: `https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/taxdump.tar.gz` (~80 MB, 2.5M taxa)

**New files:** `parse-gene-info-tsv.ts` + `parse-taxonomy-dump.ts` + specs
**Replaces:** `geneById()`, `geneBySymbol()`, `taxonomy()`

### pubchem

**New export:** `parseCompoundExtras(files: CompoundExtrasInput): ReadonlyArray<CompoundProperty>`

```typescript
import { parseCompoundExtras } from '@ncbijs/pubchem';

const compounds = parseCompoundExtras({
  smiles: fs.readFileSync('CID-SMILES', 'utf-8'),
  inchiKeys: fs.readFileSync('CID-InChI-Key', 'utf-8'),
  iupac: fs.readFileSync('CID-IUPAC', 'utf-8'),
});
```

**Source:** `https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/` (~15 GB total)
**New files:** `parse-compound-extras.ts` + spec
**Replaces:** `compoundByCid()`, `compoundBySmiles()`, `compoundByInchiKey()`

### snp

**New export:** `parseRefSnpJson(json: string): RefSnpReport`

```typescript
import { parseRefSnpJson } from '@ncbijs/snp';

const json = fs.readFileSync('refsnp-chr1.json', 'utf-8');
const report = parseRefSnpJson(json);
```

**Source:** `https://ftp.ncbi.nlm.nih.gov/snp/latest_release/JSON/` (~200+ GB total)
**New files:** `parse-refsnp-json.ts` + spec
**Replaces:** `refsnp()`, `refsnpBatch()`
**Note:** Impractical for most users due to size (per-chromosome files are 1-30 GB each).

### cite

**New export:** `formatCitation(article: PubmedArticle, format: CitationFormat): string`

```typescript
import { formatCitation } from '@ncbijs/cite';
import { parsePubmedXml } from '@ncbijs/pubmed-xml';

const articles = parsePubmedXml(localXml);
const ris = formatCitation(articles[0], 'ris');
```

**Source:** None extra. Uses PubmedArticle from pubmed-xml (already local).
**New files:** `format-citation.ts` + spec
**Replaces:** `cite()`, `citeMany()`

### pubtator

Already has bulk parsers: `parseBioC()` and `parsePubTatorTsv()`. No new code needed.

**Source:** `https://ftp.ncbi.nlm.nih.gov/pub/lu/PubTator3/bioconcepts2pubtator_offsets.gz` (~12 GB)

## Newly identified bulk parsers

The [exhaustive data inventory](./pipeline-architecture.md) uncovered 13 additional bulk data sources that map to existing packages. These parsers follow the same design principle — purely additive exports alongside existing HTTP methods.

### datasets (gene sub-files)

NCBI Gene publishes per-relationship TSV files alongside `gene_info.gz`:

| New export                   | Source file                    | Size    | Records                       |
| ---------------------------- | ------------------------------ | ------- | ----------------------------- |
| `parseGene2PubmedTsv(tsv)`   | `/gene/DATA/gene2pubmed.gz`    | ~249 MB | Gene-to-PubMed links          |
| `parseGene2GoTsv(tsv)`       | `/gene/DATA/gene2go.gz`        | ~1.2 GB | Gene Ontology annotations     |
| `parseGeneOrthologsTsv(tsv)` | `/gene/DATA/gene_orthologs.gz` | ~114 MB | Ortholog pairs                |
| `parseGeneHistoryTsv(tsv)`   | `/gene/DATA/gene_history.gz`   | ~152 MB | Discontinued/replaced GeneIDs |

### icite

**New export:** `parseIciteCsv(csv: string): ReadonlyArray<ICitePublication>`

**Source:** Figshare monthly snapshots (~10-20 GB). Contains 420M+ citation links with Relative Citation Ratio.

### clinical-trials

**New export:** `parseClinicalTrialJson(json: string): ReadonlyArray<StudyReport>`

**Source:** `AllAPIJSON.zip` bulk download (~5-10 GB). Contains 530K+ clinical studies. Reuses the existing `StudyReport` interface.

### litvar

**New export:** `parseLitVarJson(json: string): ReadonlyArray<LitVarVariant>`

**Source:** `/pub/lu/LitVar/litvar2_variants.json.gz` (~1.8 GB). Maps genetic variants to literature.

### medgen

**New export:** `parseMedGenRrf(files: MedGenInput): ReadonlyArray<MedGenConcept>`

**Source:** `/pub/medgen/` RRF files (MGCONSO, MGREL, MGSAT, MGDEF, MGSTY — ~500 MB total).

### clinvar (VCF format)

**New export:** `parseClinVarVcf(vcf: string): ReadonlyArray<ClinVarVariant>`

**Source:** `/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz` (~173 MB). Complements the TSV parser.

### snp (VCF format)

**New export:** `parseDbSnpVcf(vcf: string): ReadonlyArray<SnpVariant>`

**Source:** `/snp/latest_release/VCF/` (~15-20 GB). More practical than the 450 GB JSON files.

### pubchem (literature links)

**New export:** `parsePubchemLiteratureTsv(tsv: string): ReadonlyArray<CompoundLiteratureLink>`

**Source:** `/pubchem/Literature/` (~4.6 GB). Maps compounds/genes/proteins to literature.

### cdd

**New export:** `parseCddDomains(data: CddInput): ReadonlyArray<ConservedDomain>`

**Source:** `/pub/mmdb/cdd/cdd.tar.gz` (~4.3 GB). Conserved protein domains with PSSMs.

### pmc (S3 inventory)

**New export:** `parsePmcS3Inventory(csv: string): ReadonlyArray<PmcS3Record>`

**Source:** `s3://pmc-oa-opendata/inventory-reports/` (daily CSV). Used by sync engine to detect new/updated PMC articles.

## Zero internet feasibility

With ~2.5 TB of disk (RAG-relevant data only), ncbijs can run with zero internet:

| Component                    | Download size          | Local?                        |
| ---------------------------- | ---------------------- | ----------------------------- |
| Article metadata (PubMed)    | ~30 GB                 | Yes (parse with pubmed-xml)   |
| Article search (PubMed)      | Same + local FTS index | Yes (needs search engine)     |
| Full-text articles (PMC)     | ~350 GB (OA subset)    | Yes (~33% of all PMC)         |
| Entity extraction (PubTator) | ~5.7 GB (TSV)          | Yes                           |
| Pre-computed embeddings      | Tens of GB (MedCPT)    | Yes (from NCBI's own lab)     |
| Vocabulary (MeSH)            | ~360 MB                | Yes                           |
| Medical genetics (MedGen)    | ~500 MB                | Yes                           |
| Clinical variants (ClinVar)  | ~436 MB (TSV)          | Yes                           |
| SNP data (dbSNP VCF)         | ~15-20 GB              | Yes                           |
| Compound data (PubChem)      | ~15 GB (Extras)        | Yes                           |
| Chemical-literature links    | ~4.6 GB                | Yes                           |
| Gene metadata + links        | ~5 GB (all gene files) | Yes                           |
| Taxonomy                     | ~69 MB                 | Yes                           |
| ID conversion                | ~233 MB                | Yes                           |
| Citation formatting          | 0 extra                | Yes (derived from PubMed XML) |
| Citation metrics (iCite)     | ~10-20 GB              | Yes                           |
| Clinical trials              | ~5-10 GB               | Yes                           |
| Variant-literature (LitVar)  | ~1.8 GB                | Yes                           |
| Author disambiguation        | ~3.7 GB                | Yes                           |
| Sequence alignment (BLAST)   | ~700 GB - 1 TB         | Yes (local BLAST+ binary)     |

PMC: the Open Access subset covers ~33% of all PMC articles. The rest are behind publisher paywalls — a licensing wall, not a technical one. The `pmc-oa-opendata` S3 bucket (no AWS account required) is the new official distribution method.

## Storage architecture

Parsed data needs a home. The `@ncbijs/store` package defines a strategy pattern with a base `Storage` interface that all consumers (loaders, MCP tools, user code) depend on. Concrete strategies handle the storage medium.

```
Storage (interface)                    Base contract — read/write/query/stats
    ├── FileStorage (interface)        Extends Storage + path, close()
    │   ├── DuckDbFileStorage          Single .duckdb file, columnar, indexed
    │   └── JsonFileStorage            JSON files on disk (future)
    ├── CloudStorage (interface)       Extends Storage + connect(), disconnect()
    │   └── MotherDuckStorage          Cloud DuckDB via MotherDuck (future)
    └── InMemoryStorage                For tests (future)
```

```typescript
// @ncbijs/store — base contract, medium-agnostic
interface Storage {
  readonly writeRecords: (dataset: DatasetType, records: ReadonlyArray<unknown>) => Promise<void>;
  readonly getRecord: <T>(dataset: DatasetType, key: string) => Promise<T | undefined>;
  readonly searchRecords: <T>(
    dataset: DatasetType,
    query: SearchQuery,
  ) => Promise<ReadonlyArray<T>>;
  readonly getStats: () => Promise<ReadonlyArray<DatasetStats>>;
}

// File-based strategies add filesystem concerns
interface FileStorage extends Storage {
  readonly path: string;
  readonly close: () => Promise<void>;
}

// Cloud strategies add connection/auth concerns
interface CloudStorage extends Storage {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}
```

**Why DuckDB for the first implementation:**

- Columnar storage compresses ~10 GB of parsed data into ~2-3 GB
- Indexed queries across 35M genes or 119M compounds return instantly
- Single `.duckdb` file — no server, no config, portable
- Can query CSV/Parquet files directly (useful for ad-hoc exploration)
- 8x faster than SQLite for analytical workloads (scans, aggregations, filters)

**Why the strategy pattern:**

Parsers, loaders, and MCP tools depend only on `Storage`. Swapping `DuckDbFileStorage` for `MotherDuckStorage` (cloud) or `JsonFileStorage` (simple) requires zero changes to any consumer code.

## Store MCP server

The `@ncbijs/store-mcp` package exposes the stored data via MCP tools, making it queryable from Claude or any MCP client:

| Tool                    | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `store-query-variants`  | Search ClinVar variants by gene, significance, trait |
| `store-query-genes`     | Search genes by symbol, taxId, chromosome, type      |
| `store-query-taxonomy`  | Look up taxonomy node, get lineage and children      |
| `store-query-compounds` | Search compounds by CID, SMILES, InChI key           |
| `store-convert-ids`     | PMID/PMCID/DOI lookup from stored mappings           |
| `store-lookup-mesh`     | Query MeSH descriptors by name or tree number        |
| `store-stats`           | Record counts, file size, last sync per dataset      |
| `store-sql`             | Run arbitrary read-only SQL against the DuckDB file  |

## Implementation order

### Phase 1: Parsers

| Priority | Package                                         | Effort | Impact                                      |
| -------- | ----------------------------------------------- | ------ | ------------------------------------------- |
| 1        | mesh (parseMeshDescriptorXml)                   | Small  | High — enables fully local MeSH             |
| 2        | cite (formatCitation)                           | Small  | High — local citations from stored articles |
| 3        | id-converter (parsePmcIdsCsv)                   | Small  | Medium — local ID resolution                |
| 4        | clinvar (parseVariantSummaryTsv)                | Medium | High — local clinical variants              |
| 5        | datasets (parseGeneInfoTsv + parseTaxonomyDump) | Medium | High — local gene and taxonomy              |
| 6        | pubchem (parseCompoundExtras)                   | Medium | Medium — local compound lookup              |
| 7        | snp (parseRefSnpJson)                           | Small  | Low — data too large for most users         |

### Phase 2: Storage + loading

| Priority | Component                                                       | Effort | Depends on    |
| -------- | --------------------------------------------------------------- | ------ | ------------- |
| 8        | `@ncbijs/store` interfaces (Storage, FileStorage, CloudStorage) | Small  | Phase 1 types |
| 9        | `DuckDbFileStorage` strategy                                    | Medium | Phase 2.8     |
| 10       | Download scripts (~4.4 GB from NCBI FTP)                        | Small  | Nothing       |
| 11       | Load scripts (parse + store)                                    | Medium | Phase 2.9     |

### Phase 3: MCP server

| Priority | Component                            | Effort | Depends on |
| -------- | ------------------------------------ | ------ | ---------- |
| 12       | `@ncbijs/store-mcp` with query tools | Medium | Phase 2    |

### Phase 4: Additional parsers ✅ DONE

| Priority | Package                                      | Effort | Impact                                       |
| -------- | -------------------------------------------- | ------ | -------------------------------------------- |
| 13       | datasets (gene2pubmed + gene2go + orthologs) | Medium | High — gene relationship graphs for RAG      |
| 14       | icite (parseIciteCsv)                        | Small  | High — citation metrics for result ranking   |
| 15       | clinical-trials (parseClinicalTrialJson)     | Small  | Medium — local clinical trial search         |
| 16       | litvar (parseLitVarJson)                     | Small  | Medium — variant-literature local mapping    |
| 17       | medgen (parseMedGenRrf)                      | Medium | Medium — medical genetics concept resolution |
| 18       | clinvar (parseClinVarVcf)                    | Small  | Medium — VCF alternative to TSV              |
| 19       | snp (parseDbSnpVcf)                          | Small  | High — VCF is 30x smaller than JSON (~20 GB) |
| 20       | pubchem (parsePubchemLiteratureTsv)          | Small  | Medium — compound-literature links           |
| 21       | cdd (parseCddDomains)                        | Medium | Low — specialized protein domain data        |
| 22       | pmc (parsePmcS3Inventory)                    | Small  | High — enables PMC OA sync via new AWS model |

Phase 1: ~16 files, ~1,320 lines estimated.
Phase 2: ~20 files, ~1,500 lines estimated.
Phase 3: ~14 files, ~800 lines estimated.
Phase 4: ~20 files, ~1,800 lines estimated. **Delivered 13 new parsers across 10 packages (21 total bulk parsers). 6 packages converted to split layout: `icite`, `clinical-trials`, `litvar`, `medgen`, `cdd`, `pmc`.**

For the exhaustive data inventory, sync engine design, and storage schema details, see [pipeline-architecture.md](./pipeline-architecture.md).
