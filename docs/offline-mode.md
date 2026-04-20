# Offline Mode Roadmap

How ncbijs can operate with zero internet access using NCBI bulk downloads.

## Current state

6 packages are already pure computation with zero HTTP:

| Package                | Offline functions                                                                                            |
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

The mapping step is already pure computation. The offline feature exports the mappers so users can feed them local data. No breaking changes. No new classes. No data provider abstraction. Purely additive exports alongside existing HTTP methods.

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
| PMC ID mapping   | `/pub/pmc/PMC-ids.csv.gz`            | CSV      | ~100 MB         | 9.5M mappings    | Daily            |
| BLAST databases  | `/blast/db/`                         | Binary   | ~400 GB         | All sequences    | Daily            |

All data is public domain (U.S. government work) except PMC articles which carry per-article Creative Commons licenses.

## Per-package additions

### mesh

**New export:** `parseMeshDescriptorXml(xml: string): MeshTreeData`

```typescript
import { MeSH, parseMeshDescriptorXml } from '@ncbijs/mesh';

const xml = fs.readFileSync('desc2025.xml', 'utf-8');
const treeData = parseMeshDescriptorXml(xml);
const mesh = new MeSH(treeData);
mesh.expand('Asthma'); // fully offline
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

**Source:** None extra. Uses PubmedArticle from pubmed-xml (already offline).
**New files:** `format-citation.ts` + spec
**Replaces:** `cite()`, `citeMany()`

### pubtator

Already has offline parsers: `parseBioC()` and `parsePubTatorTsv()`. No new code needed.

**Source:** `https://ftp.ncbi.nlm.nih.gov/pub/lu/PubTator3/bioconcepts2pubtator_offsets.gz` (~12 GB)

## Zero internet feasibility

With ~1.5 TB of disk and a local BLAST+ install, ncbijs can run with zero internet:

| Component                    | Download size          | Offline?                      |
| ---------------------------- | ---------------------- | ----------------------------- |
| Article metadata (PubMed)    | ~35 GB                 | Yes (parse with pubmed-xml)   |
| Article search (PubMed)      | Same + local FTS index | Yes (needs search engine)     |
| Full-text articles (PMC)     | ~700 GB                | Partial (~50% is OA subset)   |
| Entity extraction (PubTator) | ~12 GB                 | Yes                           |
| Vocabulary (MeSH)            | ~360 MB                | Yes                           |
| Clinical variants (ClinVar)  | ~150 MB                | Yes                           |
| SNP data (dbSNP)             | ~200 GB                | Yes                           |
| Compound data (PubChem)      | ~100 GB                | Yes                           |
| Gene metadata                | ~600 MB                | Yes                           |
| Taxonomy                     | ~80 MB                 | Yes                           |
| ID conversion                | ~100 MB                | Yes                           |
| Citation formatting          | 0 extra                | Yes (derived from PubMed XML) |
| Sequence alignment (BLAST)   | ~400 GB                | Yes (local BLAST+ binary)     |

The only hard limit is PMC: the Open Access subset covers ~50% of articles. The other ~50% are behind publisher paywalls. That is a licensing wall, not a technical one.

## Implementation order

| Priority | Package                                         | Effort | Impact                                       |
| -------- | ----------------------------------------------- | ------ | -------------------------------------------- |
| 1        | mesh (parseMeshDescriptorXml)                   | Small  | High — enables fully offline MeSH            |
| 2        | cite (formatCitation)                           | Small  | High — offline citations from local articles |
| 3        | id-converter (parsePmcIdsCsv)                   | Small  | Medium — offline ID resolution               |
| 4        | clinvar (parseVariantSummaryTsv)                | Medium | High — offline clinical variants             |
| 5        | datasets (parseGeneInfoTsv + parseTaxonomyDump) | Medium | High — offline gene and taxonomy             |
| 6        | pubchem (parseCompoundExtras)                   | Medium | Medium — offline compound lookup             |
| 7        | snp (parseRefSnpJson)                           | Small  | Low — data too large for most users          |

Total new code: ~14 files (7 implementations + 7 test files), ~1,320 lines estimated.
