# Offline RAG Architecture

Storage-agnostic architecture for running ncbijs against local NCBI data at RAG-pipeline throughput (no API rate limits).

## Problem

The NCBI API allows 10 requests/second with an API key. A RAG pipeline indexing 37M+ PubMed articles needs orders of magnitude more throughput. The solution: download bulk data from NCBI FTP, parse it with existing ncbijs parsers, and store it in a database that the user controls.

## Design Principle

**ncbijs defines the contract, users bring the storage.** The library provides:

1. A `Storage` interface that describes what a store must do
2. Parsers that convert NCBI bulk data into typed objects
3. A `DuckDbFileStorage` reference implementation (single `.duckdb` file)

Users can implement `Storage` with any backend. The strategy pattern ensures parsers, loaders, and MCP tools never depend on a specific storage engine.

## Architecture Overview

```
NCBI FTP / AWS S3
       │
       ▼
┌──────────────────────┐
│  Download scripts     │  Fetch bulk files, decompress
└────────┬─────────────┘
         │ raw XML/TSV/CSV/JSON files
         ▼
┌──────────────────────┐
│  ncbijs parsers       │  parseMeshDescriptorXml(), parseGeneInfoTsv(), etc.
│  (existing packages)  │  Pure computation: string → typed objects
└────────┬─────────────┘
         │ ReadonlyArray<MeshDescriptor>
         │ ReadonlyArray<GeneReport>
         │ ReadonlyArray<VariantReport>
         ▼
┌──────────────────────┐
│  @ncbijs/store        │  Storage interface + strategy pattern
│  (Storage,            │
│   FileStorage,        │
│   CloudStorage)       │
└────────┬─────────────┘
         │ implements
         ▼
┌──────────────────────┐
│  DuckDbFileStorage    │  Single .duckdb file (~2-3 GB)
│  (reference strategy) │  Columnar, indexed, SQL-queryable
└────────┬─────────────┘
         │ queried by
         ▼
┌──────────────────────┐
│  @ncbijs/store-mcp    │  MCP tools for querying stored data
│  (query, search, sql) │  Works with any Storage implementation
└──────────────────────┘
```

## Storage Strategy Pattern

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
// @ncbijs/store — zero runtime dependencies, interfaces + one DuckDB strategy

type DatasetType = 'mesh' | 'clinvar' | 'genes' | 'taxonomy' | 'compounds' | 'id-mappings';

// ─── Base Contract (medium-agnostic) ──────────────────────────

interface Storage {
  readonly writeRecords: (dataset: DatasetType, records: ReadonlyArray<unknown>) => Promise<void>;
  readonly getRecord: <T>(dataset: DatasetType, key: string) => Promise<T | undefined>;
  readonly searchRecords: <T>(
    dataset: DatasetType,
    query: SearchQuery,
  ) => Promise<ReadonlyArray<T>>;
  readonly getStats: () => Promise<ReadonlyArray<DatasetStats>>;
}

// ─── File-Based Strategies ────────────────────────────────────

interface FileStorage extends Storage {
  readonly path: string;
  readonly close: () => Promise<void>;
}

// ─── Cloud Strategies ─────────────────────────────────────────

interface CloudStorage extends Storage {
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

// ─── Query Types ──────────────────────────────────────────────

interface SearchQuery {
  readonly field: string;
  readonly value: string;
  readonly operator?: 'eq' | 'contains' | 'starts_with';
  readonly limit?: number;
}

interface DatasetStats {
  readonly dataset: DatasetType;
  readonly recordCount: number;
  readonly sizeBytes: number;
  readonly lastUpdated?: string;
}
```

### Why this pattern

| Concern                     | Decision                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Parsers depend on storage?  | No — parsers return typed arrays, loaders call `Storage.writeRecords()`                                                  |
| MCP tools depend on DuckDB? | No — MCP tools call `Storage.searchRecords()`                                                                            |
| Swap DuckDB for cloud?      | Implement `CloudStorage`, pass to loader/MCP — zero code changes elsewhere                                               |
| Why not one interface?      | `FileStorage` needs `path` + `close()`, `CloudStorage` needs `connect()` + `disconnect()` — different lifecycle concerns |

### Why DuckDB for the reference implementation

| Factor                    | DuckDB                      | SQLite          | JSON files            |
| ------------------------- | --------------------------- | --------------- | --------------------- |
| 10 GB parsed data on disk | ~2-3 GB                     | ~8-9 GB         | ~10 GB                |
| Query 35M genes by symbol | Instant (indexed, columnar) | Slow (row scan) | Read 4 GB into memory |
| Analytical queries        | 8x faster (vectorized)      | Single-threaded | Not supported         |
| Native CSV/Parquet query  | Yes                         | No              | No                    |
| Single file, no server    | Yes                         | Yes             | Yes (many files)      |

## Sync Engine

```typescript
// @ncbijs/sync — depends on @ncbijs/store (interfaces) + existing parsers

import type { Storage } from '@ncbijs/store';

interface SyncOptions {
  readonly store: Storage;
  readonly datasets: ReadonlyArray<Dataset>;
  readonly onProgress?: (event: ProgressEvent) => void;
  readonly signal?: AbortSignal;
}

type Dataset =
  // Tier 1: Literature
  | 'pubmed'
  | 'pmc'
  | 'pmc-ids'
  | 'icite'
  | 'bookshelf'
  // Tier 2: NLP/AI annotations
  | 'pubtator'
  | 'pubtator-bioc'
  | 'medcpt-embeddings'
  | 'litvar'
  | 'computed-authors'
  // Tier 3: Vocabularies
  | 'mesh'
  | 'medgen'
  | 'cdd'
  // Tier 4: Variation
  | 'clinvar'
  | 'dbsnp'
  | 'dbvar'
  // Tier 5: Gene & taxonomy
  | 'gene'
  | 'gene-pubmed'
  | 'gene-go'
  | 'taxonomy'
  // Tier 6: Chemistry
  | 'pubchem'
  | 'pubchem-literature'
  // Tier 7: Clinical
  | 'clinical-trials'
  // Tier 8: Pathogen
  | 'pathogen'
  | 'amrfinder';

interface ProgressEvent {
  readonly dataset: string;
  readonly phase: 'download' | 'parse' | 'store';
  readonly current: number;
  readonly total: number;
}

async function sync(options: SyncOptions): Promise<SyncReport>;
```

### Sync flow per dataset

**PubMed (baseline + daily updates):**

```
1. Read sync state → last processed file (e.g., "pubmed26n1342.xml.gz")
2. List FTP directory → find files after last processed
3. For each new file:
   a. Download .xml.gz from FTP
   b. Decompress → stream through createPubmedXmlStream()
   c. Batch articles (1,000 at a time)
   d. Call store.writeRecords('articles', batch)
   e. Parse <DeleteCitation> → delete by key
   f. Update sync state with file name
4. Report: { added: N, updated: M, deleted: K }
```

**MeSH (annual XML):**

```
1. Download desc20XX.xml from NLM
2. Parse with parseMeshDescriptorXml() → MeshTreeData
3. Call store.writeRecords('mesh', descriptors)
4. Update sync state
```

**Other datasets:** Same pattern — download, parse with the appropriate parser, call `store.writeRecords()`.

### What the sync engine does NOT do

- Choose or configure a database
- Create tables or indexes
- Manage embeddings (that's the user's pipeline)
- Run on a schedule (use cron, GitHub Actions, or cloud functions)

## Exhaustive NCBI Data Inventory

Total NCBI data footprint: ~60+ PB (dominated by SRA at ~47 PB). The RAG-relevant subset below totals **~1.5 TB compressed** — everything a biomedical RAG pipeline needs without touching raw sequence data.

### Tier 1: Literature & Bibliographic (~2.1 TB)

| Dataset              | FTP/S3 Path                   | Format             | Compressed                            | Records              | Update            | Delta?                                      |
| -------------------- | ----------------------------- | ------------------ | ------------------------------------- | -------------------- | ----------------- | ------------------------------------------- |
| PubMed baseline      | `/pubmed/baseline/`           | XML.gz             | ~30 GB (1,334 files)                  | 37.6M citations      | Annual (Dec)      | N/A (full snapshot)                         |
| PubMed daily updates | `/pubmed/updatefiles/`        | XML.gz             | ~5-20 MB/file                         | ~4,300/day           | Daily             | **Yes** (full records + `<DeleteCitation>`) |
| PMC Open Access      | `s3://pmc-oa-opendata/` (AWS) | JATS XML, PDF, TXT | ~350 GB (OA subset)                   | ~3.4M articles       | Continuous        | **Yes** (S3 ETags + daily inventory)        |
| PMC all articles     | `s3://pmc-oa-opendata/`       | JATS XML           | ~700 GB total (incl. non-OA metadata) | 10.2M articles       | Continuous        | **Yes**                                     |
| PMC ID mapping       | `/pub/pmc/PMC-ids.csv.gz`     | CSV                | ~233 MB                               | 9.5M mappings        | Regular           | No                                          |
| Bookshelf            | `/pub/bookshelf/`             | MARC, XML          | ~5-10 GB                              | ~13,150 books        | Continuous        | No                                          |
| NLM Catalog          | E-utilities only              | XML                | ~1 GB                                 | 1.65M records        | Continuous        | No                                          |
| iCite                | Figshare snapshots            | CSV, JSON          | ~10-20 GB                             | 420M+ citation links | Monthly snapshots | No                                          |
| Literature Archive   | `/pub/litarch/`               | Publisher files    | ~2 GB index                           | Full-text deposits   | Continuous        | No                                          |
| PubMed deleted PMIDs | `/pubmed/deleted.pmids.gz`    | Text               | Small                                 | Cumulative list      | Annual            | N/A                                         |
| PubMed journal list  | `/pubmed/J_Entrez.txt`        | Text               | ~9.5 MB                               | All journals         | Regular           | No                                          |

### Tier 2: NLP/AI Annotations & Embeddings (`/pub/lu/`) (~1.8 TB)

This is the treasure trove for RAG. NCBI's Computational Biology Branch publishes pre-computed annotations, embeddings, and NER models:

| Dataset                  | FTP Path                                     | Format                  | Compressed                                                                                       | Records                                | Update     | Notes                                                                                   |
| ------------------------ | -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| **PMCSMBioC**            | `/pub/lu/PMCSMBioC/`                         | BioC XML                | **~1.5 TB** (256 archives × 3.3-8.9 GB)                                                          | Sentence-level annotations for all PMC | Periodic   | Sentence-level BioC for entire PMC — gold for RAG chunking                              |
| **PubTator3 (BioC XML)** | `/pub/lu/PubTator3/BioCXML.*.tar.gz`         | BioC XML                | **~200 GB** (10 archives × ~20 GB)                                                               | 36M abstracts + 6.3M full-texts        | Monthly    | Full entity-annotated PubMed + PMC                                                      |
| **PubTator3 (TSV)**      | `/pub/lu/PubTator3/bioconcepts2pubtator3.gz` | TSV                     | ~5.7 GB                                                                                          | 1B+ annotations                        | Monthly    | Lighter: entity annotations only                                                        |
| PubTator3 per-entity     | `/pub/lu/PubTator3/{type}2pubtator3.gz`      | TSV                     | chemical 1.7G, disease 2.0G, gene 716M, mutation 110M, species 461M, cellline 68M, relation 277M | Per-type                               | Monthly    | Can download only needed entity types                                                   |
| **MedCPT embeddings**    | `/pub/lu/MedCPT/pubmed_embeddings/`          | Binary                  | Unknown (likely tens of GB)                                                                      | Pre-computed PubMed embeddings         | Periodic   | NCBI's own contrastive pre-trained embeddings — may eliminate need for custom embedding |
| **BioConceptVec**        | `/pub/lu/BioConceptVec/`                     | Binary                  | ~10 GB (4 models × 2.4 GB)                                                                       | Concept embeddings                     | Static     | FastText, GloVe, Word2Vec biomedical concept vectors                                    |
| LitVar                   | `/pub/lu/LitVar/litvar2_variants.json.gz`    | JSON                    | ~1.8 GB                                                                                          | Variant-literature links               | Periodic   | Maps genetic variants to literature                                                     |
| LitCovid                 | `/pub/lu/LitCovid/`                          | BioC XML/JSON, RIS, TSV | ~5 GB total                                                                                      | ~350K COVID articles                   | Continuous | COVID-19 literature with annotations                                                    |
| LongCovid                | `/pub/lu/LongCovid/`                         | Annotations             | Weekly files                                                                                     | Long COVID tracking                    | Weekly     | 2022-2026 weekly annotation releases                                                    |
| BioRED                   | `/pub/lu/BioRED/`                            | Corpus                  | ~3 GB                                                                                            | Relation extraction dataset            | Static     | Biomedical relation extraction training data                                            |
| ComputedAuthors          | `/pub/lu/ComputedAuthors/`                   | JSON                    | ~3.7 GB                                                                                          | Author disambiguation                  | Periodic   | Computed author name disambiguation for all PubMed                                      |
| AIONER                   | `/pub/lu/AIONER/`                            | Models                  | ~8.8 GB (code + models)                                                                          | NER models                             | Static     | All-in-one named entity recognition                                                     |
| GNorm2                   | `/pub/lu/GNorm2/`                            | Models                  | ~5.6 GB                                                                                          | Gene normalization                     | Static     | Gene name normalization tool + models                                                   |
| tmVar3                   | `/pub/lu/tmVar3/`                            | Database + code         | ~100 GB (10 parts)                                                                               | Variant mentions                       | Static     | Variant mention recognition database                                                    |
| NLMChem                  | `/pub/lu/NLMChem/`                           | Corpus + tagger         | ~681 MB                                                                                          | Chemical NER                           | Static     | Chemical entity recognition                                                             |
| PhenoTagger              | `/pub/lu/PhenoTagger/`                       | Models                  | ~2 GB                                                                                            | Phenotype NER                          | Static     | Phenotype entity recognition                                                            |
| TrialGPT                 | `/pub/lu/TrialGPT/`                          | Corpus                  | ~1.1 GB                                                                                          | Clinical trial matching                | Static     | LLM-based clinical trial matching corpus                                                |
| DrugKLM                  | `/pub/lu/DrugKLM/`                           | Database                | ~5.2 GB                                                                                          | Drug knowledge                         | Static     | Drug knowledge language model                                                           |

### Tier 3: Vocabularies & Ontologies (~40 GB)

| Dataset          | FTP/S3 Path                                             | Format      | Compressed | Records                          | Update       | Delta? |
| ---------------- | ------------------------------------------------------- | ----------- | ---------- | -------------------------------- | ------------ | ------ |
| MeSH descriptors | `nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/` | XML         | ~360 MB    | 355K descriptors                 | Annual (Dec) | No     |
| MeSH SCRs        | `nlmpubs.nlm.nih.gov/projects/mesh/`                    | XML         | ~200 MB    | Supplementary concepts           | Daily (M-F)  | No     |
| MeSH RDF         | `nlmpubs.nlm.nih.gov/projects/mesh/rdf/`                | N-Triples   | ~500 MB    | Full MeSH as linked data         | Daily (M-F)  | No     |
| UMLS             | UMLS download (license required)                        | RRF         | ~35 GB     | 3.45M concepts, 190 vocabularies | Biannual     | No     |
| RxNorm           | UMLS download                                           | RRF         | ~2 GB      | All FDA drugs                    | Monthly      | No     |
| MedGen           | `/pub/medgen/`                                          | RRF, text   | ~500 MB    | 225K medical genetics concepts   | Monthly      | No     |
| CDD              | `/pub/mmdb/cdd/cdd.tar.gz`                              | PSSM, FASTA | ~4.3 GB    | 67K domain models                | Periodic     | No     |

### Tier 4: Variation & Clinical Genetics (~25 GB public)

| Dataset                 | FTP/S3 Path                   | Format       | Compressed                                                         | Records                   | Update         | Delta? |
| ----------------------- | ----------------------------- | ------------ | ------------------------------------------------------------------ | ------------------------- | -------------- | ------ |
| ClinVar (tab-delimited) | `/pub/clinvar/tab_delimited/` | TSV.gz       | variant_summary 436M, hgvs4variation 514M, submission_summary 377M | 3.07M records             | Weekly/monthly | No     |
| ClinVar (XML)           | `/pub/clinvar/xml/`           | XML.gz       | ~2-5 GB total                                                      | Full ClinVar              | Monthly        | No     |
| ClinVar (VCF)           | `/pub/clinvar/vcf_GRCh38/`    | VCF.gz       | ~173 MB                                                            | Genomic variants          | Monthly        | No     |
| dbSNP (VCF)             | `/snp/latest_release/VCF/`    | VCF.gz       | ~15-20 GB                                                          | 1.12B rs records          | Per-build      | No     |
| dbSNP (JSON)            | `/snp/latest_release/JSON/`   | JSON.bz2     | ~450 GB                                                            | Per-chromosome files      | Per-build      | No     |
| dbVar                   | `/pub/dbVar/data/`            | VCF, tabular | ~5-10 GB                                                           | 8.15M structural variants | Continuous     | No     |
| GTR                     | E-utilities only              | XML          | ~200 MB                                                            | 70K genetic tests         | Continuous     | No     |

### Tier 5: Gene, Taxonomy & Organisms (~25 GB)

| Dataset                | FTP/S3 Path                      | Format               | Compressed | Records                       | Update   | Delta? |
| ---------------------- | -------------------------------- | -------------------- | ---------- | ----------------------------- | -------- | ------ |
| Gene info              | `/gene/DATA/gene_info.gz`        | TSV                  | ~1.4 GB    | 54.8M gene records            | Daily    | No     |
| Gene-to-PubMed         | `/gene/DATA/gene2pubmed.gz`      | TSV                  | ~249 MB    | Gene-literature links         | Daily    | No     |
| Gene-to-GO             | `/gene/DATA/gene2go.gz`          | TSV                  | ~1.2 GB    | Gene Ontology annotations     | Daily    | No     |
| Gene-to-RefSeq         | `/gene/DATA/gene2refseq.gz`      | TSV                  | ~2.1 GB    | Gene-sequence links           | Daily    | No     |
| Gene-to-Ensembl        | `/gene/DATA/gene2ensembl.gz`     | TSV                  | ~276 MB    | NCBI-Ensembl mapping          | Daily    | No     |
| Gene history           | `/gene/DATA/gene_history.gz`     | TSV                  | ~152 MB    | Discontinued/replaced GeneIDs | Daily    | No     |
| Gene orthologs         | `/gene/DATA/gene_orthologs.gz`   | TSV                  | ~114 MB    | Ortholog pairs                | Daily    | No     |
| Gene summary           | `/gene/DATA/gene_summary.gz`     | TSV                  | Small      | Gene function summaries       | Daily    | No     |
| Taxonomy dump          | `/pub/taxonomy/taxdump.tar.gz`   | DMP (pipe-delimited) | ~69 MB     | 2.73M taxa                    | Hourly   | No     |
| Taxonomy (extended)    | `/pub/taxonomy/new_taxdump/`     | DMP                  | ~69 MB     | + lineage, type material      | Hourly   | No     |
| Taxonomy accession map | `/pub/taxonomy/accession2taxid/` | TSV                  | Several GB | Accession-to-TaxID            | Regular  | No     |
| GeneReviews            | `/pub/GeneReviews/`              | Text                 | ~133 KB    | Disease-gene mapping          | Regular  | No     |
| CCDS                   | `/pub/CCDS/`                     | Text                 | ~50 MB     | ~34K consensus coding seqs    | Periodic | No     |
| COG                    | `/pub/COG/COG2024/`              | TSV                  | ~500 MB    | Protein ortholog groups       | Periodic | No     |

### Tier 6: Chemistry & Bioassays (~1-2 TB)

| Dataset                 | FTP/S3 Path                       | Format           | Compressed     | Records                                | Update       | Delta?                                       |
| ----------------------- | --------------------------------- | ---------------- | -------------- | -------------------------------------- | ------------ | -------------------------------------------- |
| PubChem Compound Extras | `/pubchem/Compound/Extras/`       | TSV              | ~15 GB         | 119M compounds                         | Weekly       | No                                           |
| PubChem Compound Full   | `/pubchem/Compound/CURRENT-Full/` | SDF, XML, ASN.1  | ~60-200 GB     | 119M compounds                         | Snapshot     | **Yes** (Daily `killed-CIDs`/`updated-CIDs`) |
| PubChem Substance       | `/pubchem/Substance/`             | SDF, XML         | ~200-400 GB    | 320M substances                        | Daily/weekly | **Yes** (Daily dirs)                         |
| PubChem BioAssay        | `/pubchem/Bioassay/`              | XML, CSV, JSON   | ~100+ GB       | 1.67M assays                           | Continuous   | No                                           |
| PubChem Literature      | `/pubchem/Literature/`            | TSV              | ~4.6 GB        | Compound/gene/protein-literature links | Regular      | No                                           |
| PubChem RDF             | `/pubchem/RDF/`                   | Turtle (.ttl.gz) | ~500 GB - 1 TB | All PubChem as RDF                     | Periodic     | No                                           |
| PubChem Co-occurrence   | `/pubchem/Cooccurrence/`          | TSV              | Varies         | Literature/patent co-occurrence        | Regular      | No                                           |
| PubChem Patents         | `/pubchem/Patents/`               | TSV              | ~619 MB        | Patent-chemical linkages               | Regular      | No                                           |

### Tier 7: Clinical & Drug Data (~60 GB)

| Dataset            | Source                                           | Format    | Compressed | Records                               | Update     | Access             |
| ------------------ | ------------------------------------------------ | --------- | ---------- | ------------------------------------- | ---------- | ------------------ |
| ClinicalTrials.gov | `clinicaltrials.gov/api/v2/` or `AllAPIJSON.zip` | JSON, CSV | ~5-10 GB   | 530K+ studies                         | Continuous | Open (REST API v2) |
| DailyMed           | `dailymed.nlm.nih.gov`                           | SPL XML   | ~50-100 GB | ~171K drug labels                     | Regular    | Open               |
| RxNorm             | UMLS download                                    | RRF       | ~2 GB      | All FDA drugs                         | Monthly    | UMLS license       |
| MedlinePlus        | `medlineplus.gov`                                | XML, JSON | ~130 MB    | ~1,000 health topics + 2,800 genetics | Regular    | Open               |

### Tier 8: Pathogen & AMR (~100 GB)

| Dataset            | FTP/S3 Path                                         | Format     | Compressed | Records                 | Update     | Notes                        |
| ------------------ | --------------------------------------------------- | ---------- | ---------- | ----------------------- | ---------- | ---------------------------- |
| Pathogen Detection | `/pathogen/Results/`                                | TSV, FASTA | ~50-100 GB | 1.97M isolates, 84 taxa | Continuous | Per-organism directories     |
| AMRFinder          | `/pathogen/Antimicrobial_resistance/AMRFinderPlus/` | HMM, FASTA | ~500 MB    | AMR gene database       | Regular    | AMR gene + point mutation DB |
| MicroBIGG-E        | GCP BigQuery                                        | TSV        | ~50+ GB    | 31.5M AMR genes         | Continuous | Also on BigQuery             |

### Tier 9: Sequence & Genomic Data (multi-TB, for specialized RAG)

| Dataset           | FTP/S3 Path                                | Format                  | Compressed     | Records                         | Update     | Notes                       |
| ----------------- | ------------------------------------------ | ----------------------- | -------------- | ------------------------------- | ---------- | --------------------------- |
| GenBank           | `/genbank/`                                | Flat file, ASN.1, FASTA | ~5-8 TB        | 6.27B sequences                 | Bimonthly  | Complete nucleotide archive |
| RefSeq            | `/refseq/`                                 | GenBank, FASTA, GFF3    | ~3-5 TB        | 578M records                    | Bimonthly  | Curated reference sequences |
| Genome assemblies | `/genomes/`                                | FASTA, GFF3             | ~10+ TB        | ~2M assemblies                  | Continuous | All organisms               |
| BLAST databases   | `/blast/db/` + `s3://ncbi-blast-databases` | BLAST DB                | ~700 GB - 1 TB | nr, nt, refseq, swissprot, etc. | Daily      | Pre-formatted for BLAST     |
| SRA               | `/sra/` + `s3://sra-pub-src-*`             | SRA, FASTQ, BAM         | **~47 PB**     | 34.7M runs                      | Continuous | Raw sequencing data         |
| GEO               | `/geo/`                                    | SOFT, MINiML            | ~200+ TB       | 200K+ studies                   | Continuous | Gene expression data        |
| Influenza         | `/genomes/INFLUENZA/`                      | FASTA                   | ~234 MB        | All flu sequences               | Regular    | Complete flu resource       |
| Viral genomes     | `/genomes/Viruses/`                        | FASTA, metadata         | ~200 MB+       | All viral genomes               | Regular    | All NCBI viral data         |

### Tier 10: Structure, Domains & Protein (~12 GB)

| Dataset        | FTP/S3 Path                | Format             | Compressed | Records                      | Update   |
| -------------- | -------------------------- | ------------------ | ---------- | ---------------------------- | -------- |
| CDD            | `/pub/mmdb/cdd/cdd.tar.gz` | PSSM, FASTA, ASN.1 | ~4.3 GB    | 67K domains                  | Periodic |
| CDD (all)      | `/pub/mmdb/cdd/acd.tar.gz` | PSSM               | ~7.2 GB    | All conserved domains        | Periodic |
| MMDB/Structure | `/mmdb/`                   | ASN.1, PDB-like    | ~100 GB    | 223K structures              | Weekly   |
| HMM/NCBIfam    | `/hmm/current/`            | HMM profiles       | ~5 GB      | Protein family models        | Regular  |
| BioSystems     | `/pub/biosystems/CURRENT/` | Tabular            | ~2 GB      | Pathways from KEGG, Reactome | Periodic |
| UniVec         | `/pub/UniVec/`             | FASTA              | ~2 MB      | Vector/adapter sequences     | Stable   |

### Tier 11: Metadata & Tracking

| Dataset          | FTP/S3 Path                       | Format | Compressed | Records           | Update     |
| ---------------- | --------------------------------- | ------ | ---------- | ----------------- | ---------- |
| BioProject       | `/bioproject/bioproject.xml`      | XML    | ~3.6 GB    | 811K projects     | Continuous |
| BioSample        | `/biosample/biosample_set.xml.gz` | XML    | ~4.0 GB    | 40.4M samples     | Continuous |
| Assembly Reports | `/genomes/ASSEMBLY_REPORTS/`      | TSV    | ~2 GB      | Assembly metadata | Continuous |

### Size summary for RAG-relevant data

| Tier                  | What                                      | Compressed  |
| --------------------- | ----------------------------------------- | ----------- |
| 1                     | Literature (PubMed + PMC OA + iCite)      | ~400 GB     |
| 2                     | NLP annotations + embeddings (`/pub/lu/`) | ~1.8 TB     |
| 3                     | Vocabularies (MeSH, UMLS, MedGen, CDD)    | ~40 GB      |
| 4                     | Variation (ClinVar, dbSNP VCF, dbVar)     | ~25 GB      |
| 5                     | Gene, taxonomy, organisms                 | ~25 GB      |
| 6                     | Chemistry (PubChem Extras + Literature)   | ~20 GB      |
| 7                     | Clinical (ClinicalTrials.gov, DailyMed)   | ~60 GB      |
| 8                     | Pathogen & AMR                            | ~100 GB     |
| **Total (Tiers 1-8)** | **Core RAG dataset**                      | **~2.5 TB** |
| 9                     | Sequences (GenBank, RefSeq, BLAST)        | ~10+ TB     |
| 10                    | Structures & domains                      | ~12 GB      |
| 11                    | Metadata (BioProject, BioSample)          | ~8 GB       |
| **Total (all tiers)** | **Everything downloadable**               | **~15+ TB** |

### Delta / incremental update mechanisms

Only three datasets have proper delta mechanisms:

| Dataset     | Delta mechanism                    | Details                                                                                         |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| **PubMed**  | Daily update files                 | Full `<PubmedArticle>` records + `<DeleteCitation>`. ~4,300 new/day. Sequential file numbering. |
| **PMC OA**  | AWS S3 ETags + daily inventory     | Per-article-version directories. Legacy FTP deprecated April 2026, removed August 2026.         |
| **PubChem** | Daily `killed-CIDs`/`updated-CIDs` | Explicit change tracking in daily directories.                                                  |

Everything else regenerates full files on schedule. Delta detection requires content hashing, file timestamp comparison, or EInfo API polling (`lastupdate`/`dbbuild`).

### Key discovery: MedCPT pre-computed embeddings

NCBI's own lab publishes pre-computed PubMed article embeddings at `/pub/lu/MedCPT/pubmed_embeddings/`. These are contrastive pre-trained transformer embeddings trained on 255M PubMed query-article pairs. This could **eliminate the need for users to compute their own embeddings** — the sync engine could download these directly alongside article data.

## Reference Implementation: DuckDbFileStorage

The reference implementation ships as `DuckDbFileStorage` in `@ncbijs/store` — a single `.duckdb` file with columnar compression and indexed queries.

### DuckDB schema

```sql
CREATE TABLE mesh_descriptors (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  tree_numbers VARCHAR[],
  qualifiers JSON,
  pharmacological_actions VARCHAR[],
  supplementary_concepts VARCHAR[]
);
CREATE INDEX idx_mesh_name ON mesh_descriptors(name);

CREATE TABLE clinvar_variants (
  uid VARCHAR PRIMARY KEY,
  title VARCHAR,
  object_type VARCHAR,
  accession VARCHAR,
  clinical_significance VARCHAR,
  genes JSON,
  traits JSON,
  locations JSON
);

CREATE TABLE genes (
  gene_id INTEGER PRIMARY KEY,
  symbol VARCHAR NOT NULL,
  description VARCHAR,
  tax_id INTEGER NOT NULL,
  type VARCHAR,
  chromosomes VARCHAR[],
  synonyms VARCHAR[],
  swiss_prot_accessions VARCHAR[],
  ensembl_gene_ids VARCHAR[],
  omim_ids VARCHAR[]
);
CREATE INDEX idx_genes_symbol ON genes(symbol);
CREATE INDEX idx_genes_tax_id ON genes(tax_id);

CREATE TABLE taxonomy (
  tax_id INTEGER PRIMARY KEY,
  organism_name VARCHAR NOT NULL,
  common_name VARCHAR,
  rank VARCHAR,
  parent_tax_id INTEGER,
  lineage INTEGER[],
  children INTEGER[]
);
CREATE INDEX idx_taxonomy_name ON taxonomy(organism_name);

CREATE TABLE compounds (
  cid INTEGER PRIMARY KEY,
  canonical_smiles VARCHAR,
  inchi_key VARCHAR,
  iupac_name VARCHAR,
  exact_mass DOUBLE,
  molecular_weight DOUBLE
);
CREATE INDEX idx_compounds_inchi ON compounds(inchi_key);

CREATE TABLE id_mappings (
  pmcid VARCHAR,
  pmid VARCHAR,
  doi VARCHAR,
  mid VARCHAR,
  release_date VARCHAR
);
CREATE INDEX idx_idmap_pmid ON id_mappings(pmid);
CREATE INDEX idx_idmap_pmcid ON id_mappings(pmcid);
CREATE INDEX idx_idmap_doi ON id_mappings(doi);

CREATE TABLE sync_state (
  dataset VARCHAR PRIMARY KEY,
  last_file VARCHAR,
  last_update VARCHAR
);
```

### DuckDbFileStorage implementation sketch

```typescript
import type { FileStorage, DatasetType, SearchQuery, DatasetStats } from '@ncbijs/store';
import { DuckDBInstance } from '@duckdb/node-api';

class DuckDbFileStorage implements FileStorage {
  public readonly path: string;
  private readonly _db: DuckDBInstance;

  constructor(dbPath: string) {
    this.path = dbPath;
    // Open or create the .duckdb file
  }

  async writeRecords(dataset: DatasetType, records: ReadonlyArray<unknown>): Promise<void> {
    // Batch INSERT with prepared statements
    // Maps dataset type to the correct table
  }

  async getRecord<T>(dataset: DatasetType, key: string): Promise<T | undefined> {
    // SELECT by primary key from the appropriate table
  }

  async searchRecords<T>(dataset: DatasetType, query: SearchQuery): Promise<ReadonlyArray<T>> {
    // Parameterized SQL query with operator mapping
    // 'eq' → =, 'contains' → LIKE '%...%', 'starts_with' → LIKE '...%'
  }

  async getStats(): Promise<ReadonlyArray<DatasetStats>> {
    // SELECT COUNT(*) from each table + file size from disk
  }

  async close(): Promise<void> {
    // Close DuckDB connection
  }
}
```

### Docker setup

```yaml
# docker-compose.yml
services:
  ncbijs-store:
    build: .
    volumes:
      - ncbijs-data:/data/db # Persist .duckdb file
      - ncbijs-cache:/data/raw # Cache downloaded FTP files
    environment:
      - NCBI_API_KEY=${NCBI_API_KEY}

volumes:
  ncbijs-data:
  ncbijs-cache:
```

### Usage

```typescript
import { DuckDbStore } from './duckdb-store';
import { sync } from '@ncbijs/sync';

// User creates their store
const store = new DuckDbStore('/data/db/ncbijs.duckdb');

// Sync downloads from NCBI and writes to the store
await sync({
  store,
  datasets: ['pubmed', 'mesh'],
  onProgress: (event) => {
    console.log(`${event.dataset}: ${event.phase} ${event.current}/${event.total}`);
  },
});

// User queries their store directly
const results = await store.searchArticles('CRISPR gene therapy', {
  maxResults: 20,
  filters: { dateRange: ['2023-01-01', '2026-01-01'] },
});
```

### Alternative backends

Users can implement the same interfaces with any technology:

| Backend               | Best for                             | npm package                           |
| --------------------- | ------------------------------------ | ------------------------------------- |
| DuckDB                | Analytical queries, Parquet I/O      | `duckdb-node`                         |
| PostgreSQL + pgvector | Production server, concurrent access | `pg` + `pgvector`                     |
| SQLite + sqlite-vec   | Embedded, lightweight                | `better-sqlite3` + `sqlite-vec`       |
| Elasticsearch         | Full-text search at scale            | `@elastic/elasticsearch`              |
| Qdrant + SQLite       | Best vector performance              | `@qdrant/js-client-rest`              |
| MotherDuck            | Cloud DuckDB (serverless)            | `duckdb-node` (with `md:` connection) |

## Automated Updates

The sync engine handles the download-parse-store pipeline. Scheduling is the user's responsibility:

### GitHub Actions (free, simplest)

```yaml
name: NCBI Sync
on:
  schedule:
    - cron: '0 6 * * *' # Daily at 06:00 UTC
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - run: node sync.mjs # User's sync script
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ncbijs-sync
spec:
  schedule: '0 6 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: ncbijs-store:latest
              volumeMounts:
                - name: data
                  mountPath: /data/db
```

### Cloud functions

Any serverless platform (AWS Lambda, Cloudflare Workers, Google Cloud Functions) can run the sync on a schedule. The sync engine streams data to avoid memory limits.

## Update Detection

NCBI has no push notifications. The sync engine detects updates by:

| Dataset            | Detection method                                                     | Frequency    |
| ------------------ | -------------------------------------------------------------------- | ------------ |
| PubMed             | FTP directory listing — sequential file names (pubmed26nXXXX.xml.gz) | Daily        |
| PMC OA             | S3 inventory reports (daily CSV) or `aws s3 sync --dryrun`           | Daily        |
| PMC IDs            | File timestamp / MD5 on FTP                                          | Weekly       |
| iCite              | Check Figshare for new snapshots                                     | Monthly      |
| PubTator3          | File timestamp on FTP (regenerated monthly)                          | Monthly      |
| MedCPT             | File timestamp on FTP                                                | Periodic     |
| LitVar             | File timestamp on FTP                                                | Periodic     |
| MeSH               | Annual: check file date. SCRs: check daily file date                 | Annual/daily |
| MedGen             | File timestamp on FTP                                                | Monthly      |
| ClinVar            | Compare file timestamp or MD5 on FTP                                 | Weekly       |
| dbSNP              | Check build number in `/snp/latest_release/`                         | Per-build    |
| Gene               | File timestamp (regenerated daily, may not change content)           | Daily        |
| Taxonomy           | File timestamp (regenerated hourly)                                  | Daily        |
| PubChem            | `killed-CIDs` / `updated-CIDs` files in Daily directory              | Daily        |
| ClinicalTrials.gov | API v2 `query.term` with `_lastUpdatePostDate` filter                | Daily        |
| Pathogen           | Directory listing for new organism results                           | Weekly       |

Additionally, `@ncbijs/sync` can use EInfo API to check `lastupdate` and `dbbuild` fields across all 38 Entrez databases as a fast pre-check before hitting FTP. The existing `@ncbijs/http-mcp` skill `ncbi-check-updates` already implements this pattern.

## Embedding Pipeline

Embeddings are outside the sync engine's scope — they depend on the user's model choice and compute budget. The store interface accepts embeddings; generating them is the user's responsibility.

Recommended approach for users who want RAG:

```typescript
import { createEmbedder } from './my-embedder'; // User's code
import type { EmbeddingEntry } from '@ncbijs/store';

const embedder = await createEmbedder('nomic-embed-text-v1.5');

// After sync, embed new/changed articles
const newArticles = await store.getArticlesSince(lastEmbedDate);
const entries: Array<EmbeddingEntry> = [];

for (const article of newArticles) {
  const text = `${article.title} ${article.abstract.text}`;
  const embedding = await embedder.embed(text);
  entries.push({ pmid: article.pmid, embedding });
}

await store.upsertEmbeddings(entries);
```

Embedding model recommendations for biomedical text:

| Model                            | Dimensions | Context     | Notes                                        |
| -------------------------------- | ---------- | ----------- | -------------------------------------------- |
| nomic-embed-text-v1.5            | 768        | 8192 tokens | Best general-purpose, proven at PubMed scale |
| NeuML/pubmedbert-base-embeddings | 768        | 512 tokens  | Domain-specific, best for medical queries    |
| BGE-small-en-v1.5                | 384        | 512 tokens  | Lightweight, fast inference                  |

Local inference options: `transformers.js` (ONNX in Node.js), Ollama (HTTP server), `onnxruntime-node` (native bindings).

## Package Structure

```
packages/
  store/              # Interface-only (zero deps)
    src/
      index.ts
      interfaces/
        article-store.interface.ts
        search-store.interface.ts
        vector-store.interface.ts
        sync-state.interface.ts

  sync/               # Download + parse pipeline
    src/
      index.ts
      sync.ts
      interfaces/
        sync.interface.ts
      sources/
        # Tier 1: Literature
        pubmed-source.ts
        pmc-source.ts
        pmc-ids-source.ts
        icite-source.ts
        # Tier 2: NLP/AI
        pubtator-source.ts
        pubtator-bioc-source.ts
        medcpt-source.ts
        litvar-source.ts
        # Tier 3: Vocabularies
        mesh-source.ts
        medgen-source.ts
        # Tier 4: Variation
        clinvar-source.ts
        dbsnp-source.ts
        # Tier 5: Gene & taxonomy
        gene-source.ts
        gene-pubmed-source.ts
        taxonomy-source.ts
        # Tier 6: Chemistry
        pubchem-source.ts
        pubchem-literature-source.ts
        # Tier 7: Clinical
        clinical-trials-source.ts

examples/
  offline-duckdb/
    README.md
    docker-compose.yml
    Dockerfile
    duckdb-store.ts       # Reference DuckDbFileStorage implementation
    sync-job.ts           # Cron-compatible sync script
    search-example.ts     # Query example
    hybrid-search.ts      # BM25 + vector reranking example
```

## Coverage Matrix: 37 Packages vs NCBI Data Sources

### Fully covered (package + offline parser exist)

| NCBI Source        | Package        | Offline parser                                                      | Notes                                              |
| ------------------ | -------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| PubMed XML         | `pubmed-xml`   | `parsePubmedXml()`, `createPubmedXmlStream()`, `parseMedlineText()` | Streaming support for 30+ GB baseline              |
| JATS full-text     | `jats`         | `parseJATS()`, `toMarkdown()`, `toPlainText()`, `toChunks()`        | RAG-ready chunking built in                        |
| FASTA sequences    | `fasta`        | `parseFasta()`                                                      | Covers GenBank/RefSeq FASTA downloads              |
| GenBank flat files | `genbank`      | `parseGenBank()`, `createEmptyGenBankRecord()`                      | Covers `/genbank/` FTP                             |
| XML utilities      | `xml`          | `readTag()`, `readBlock()`, `readAllBlocks()`, etc.                 | Foundation for all XML parsers                     |
| BioC/PubTator TSV  | `pubtator`     | `parseBioC()`, `parsePubTatorTsv()`                                 | Covers `/pub/lu/PubTator3/` TSV + BioC             |
| MeSH (in-memory)   | `mesh`         | `lookup()`, `expand()`, `ancestors()`, etc.                         | Works offline when constructed with `MeshTreeData` |
| ID validation      | `id-converter` | `isPMID()`, `isPMCID()`, `isDOI()`, `isMID()`                       | Regex validation, no API needed                    |

### Covered via API only (package exists, offline parser planned in offline-mode.md)

| NCBI Source    | Package        | API function                   | Planned offline parser     | FTP path                           |
| -------------- | -------------- | ------------------------------ | -------------------------- | ---------------------------------- |
| MeSH XML       | `mesh`         | `sparql()`, `lookupOnline()`   | `parseMeshDescriptorXml()` | `nlmpubs.nlm.nih.gov/.../xmlmesh/` |
| ClinVar TSV    | `clinvar`      | `search()`, `fetch()`          | `parseVariantSummaryTsv()` | `/pub/clinvar/tab_delimited/`      |
| Gene info      | `datasets`     | `geneById()`, `geneBySymbol()` | `parseGeneInfoTsv()`       | `/gene/DATA/gene_info.gz`          |
| Taxonomy dump  | `datasets`     | `taxonomy()`                   | `parseTaxonomyDump()`      | `/pub/taxonomy/taxdump.tar.gz`     |
| PubChem Extras | `pubchem`      | `compoundByCid()`, etc.        | `parseCompoundExtras()`    | `/pubchem/Compound/Extras/`        |
| dbSNP JSON     | `snp`          | `refsnp()`, `refsnpBatch()`    | `parseRefSnpJson()`        | `/snp/latest_release/JSON/`        |
| PMC ID CSV     | `id-converter` | `convert()`                    | `parsePmcIdsCsv()`         | `/pub/pmc/PMC-ids.csv.gz`          |
| Citations      | `cite`         | `cite()`, `citeMany()`         | `formatCitation()`         | N/A (derived from PubMed XML)      |

### Covered via API only (package exists, NEW offline parser needed)

| NCBI Source         | Package           | API function                  | New offline parser            | FTP path                                  | Size      |
| ------------------- | ----------------- | ----------------------------- | ----------------------------- | ----------------------------------------- | --------- |
| Gene-to-PubMed      | `datasets`        | (via gene API)                | `parseGene2PubmedTsv()`       | `/gene/DATA/gene2pubmed.gz`               | ~249 MB   |
| Gene-to-GO          | `datasets`        | (via gene API)                | `parseGene2GoTsv()`           | `/gene/DATA/gene2go.gz`                   | ~1.2 GB   |
| Gene orthologs      | `datasets`        | (via gene API)                | `parseGeneOrthologsTsv()`     | `/gene/DATA/gene_orthologs.gz`            | ~114 MB   |
| Gene history        | `datasets`        | (via gene API)                | `parseGeneHistoryTsv()`       | `/gene/DATA/gene_history.gz`              | ~152 MB   |
| iCite snapshots     | `icite`           | `publications()`              | `parseIciteCsv()`             | Figshare snapshots                        | ~10-20 GB |
| ClinicalTrials bulk | `clinical-trials` | `study()`, `searchStudies()`  | `parseClinicalTrialJson()`    | `AllAPIJSON.zip`                          | ~5-10 GB  |
| LitVar bulk         | `litvar`          | `variant()`, `publications()` | `parseLitVarJson()`           | `/pub/lu/LitVar/litvar2_variants.json.gz` | ~1.8 GB   |
| MedGen RRF          | `medgen`          | `search()`, `fetch()`         | `parseMedGenRrf()`            | `/pub/medgen/`                            | ~500 MB   |
| ClinVar VCF         | `clinvar`         | `search()`, `fetch()`         | `parseClinVarVcf()`           | `/pub/clinvar/vcf_GRCh38/`                | ~173 MB   |
| dbSNP VCF           | `snp`             | `refsnp()`                    | `parseDbSnpVcf()`             | `/snp/latest_release/VCF/`                | ~15-20 GB |
| PubChem Literature  | `pubchem`         | (not covered)                 | `parsePubchemLiteratureTsv()` | `/pubchem/Literature/`                    | ~4.6 GB   |
| CDD domains         | `cdd`             | `search()`, `fetch()`         | `parseCddDomains()`           | `/pub/mmdb/cdd/`                          | ~4.3 GB   |
| PMC OA (S3)         | `pmc`             | `fetch()`, `oa.lookup()`      | S3 inventory parser           | `s3://pmc-oa-opendata/`                   | ~350 GB   |

### NOT covered (no package, sync-only sources for `@ncbijs/sync`)

These datasets don't warrant dedicated packages — they're consumed directly by the sync engine:

| NCBI Source            | FTP path                              | Format     | Size       | Parser strategy                                |
| ---------------------- | ------------------------------------- | ---------- | ---------- | ---------------------------------------------- |
| **MedCPT embeddings**  | `/pub/lu/MedCPT/pubmed_embeddings/`   | Binary     | Tens of GB | Binary loader → Storage directly               |
| **BioConceptVec**      | `/pub/lu/BioConceptVec/`              | Binary     | ~10 GB     | Vector file loader (FastText/GloVe/Word2Vec)   |
| **ComputedAuthors**    | `/pub/lu/ComputedAuthors/`            | JSON       | ~3.7 GB    | JSON stream parser                             |
| **PMCSMBioC**          | `/pub/lu/PMCSMBioC/`                  | BioC XML   | ~1.5 TB    | Reuses `parseBioC()` from `@ncbijs/pubtator`   |
| LitCovid               | `/pub/lu/LitCovid/`                   | BioC, TSV  | ~5 GB      | Subset of PubMed (filter, not separate source) |
| Gene2RefSeq            | `/gene/DATA/gene2refseq.gz`           | TSV        | ~2.1 GB    | Simple TSV parser in sync                      |
| Gene2Ensembl           | `/gene/DATA/gene2ensembl.gz`          | TSV        | ~276 MB    | Simple TSV parser in sync                      |
| Taxonomy accession map | `/pub/taxonomy/accession2taxid/`      | TSV        | Several GB | TSV parser in sync                             |
| PubChem Co-occurrence  | `/pubchem/Cooccurrence/`              | TSV        | Varies     | TSV parser in sync                             |
| PubChem Patents        | `/pubchem/Patents/`                   | TSV        | ~619 MB    | TSV parser in sync                             |
| Pathogen results       | `/pathogen/Results/`                  | TSV, FASTA | ~50-100 GB | TSV/FASTA parser in sync                       |
| AMRFinder DB           | `/pathogen/Antimicrobial_resistance/` | HMM, FASTA | ~500 MB    | Reference data loader                          |
| BioProject XML         | `/bioproject/bioproject.xml`          | XML        | ~3.6 GB    | XML parser in sync                             |
| BioSample XML          | `/biosample/biosample_set.xml.gz`     | XML        | ~4.0 GB    | XML parser in sync                             |
| Assembly Reports       | `/genomes/ASSEMBLY_REPORTS/`          | TSV        | ~2 GB      | TSV parser in sync                             |
| COG                    | `/pub/COG/COG2024/`                   | TSV        | ~500 MB    | TSV parser in sync                             |
| CCDS                   | `/pub/CCDS/`                          | Text       | ~50 MB     | Text parser in sync                            |
| GeneReviews            | `/pub/GeneReviews/`                   | Text       | ~133 KB    | Text parser in sync                            |

### Out of scope (license-required, too large, or too specialized)

| NCBI Source                   | Reason                                             | Size       |
| ----------------------------- | -------------------------------------------------- | ---------- |
| UMLS (SNOMED CT, LOINC, etc.) | Requires UMLS license                              | ~35 GB     |
| OMIM full data                | Requires OMIM license (E-utilities access limited) | ~500 MB    |
| SRA raw sequences             | ~47 PB, requires SRA Toolkit                       | ~47 PB     |
| GEO supplementary data        | ~200+ TB, specialized                              | ~200+ TB   |
| GenBank/RefSeq sequences      | ~10+ TB, needs BLAST+                              | ~10+ TB    |
| BLAST preformatted DBs        | Binary format, needs BLAST+                        | ~1 TB      |
| DailyMed SPL                  | NLM-adjacent, separate API                         | ~50-100 GB |

### Gap summary

| Category                       | Already done | Planned (offline-mode.md) | Newly identified | Total  |
| ------------------------------ | ------------ | ------------------------- | ---------------- | ------ |
| Offline parsers in packages    | 8            | 8                         | 13               | 29     |
| Sync-only sources (no package) | 0            | 0                         | 17               | 17     |
| **Total data source coverage** | **8**        | **8**                     | **30**           | **46** |

The 13 newly identified offline parsers that should be added to existing packages:

1. `datasets`: `parseGene2PubmedTsv()`, `parseGene2GoTsv()`, `parseGeneOrthologsTsv()`, `parseGeneHistoryTsv()`
2. `icite`: `parseIciteCsv()`
3. `clinical-trials`: `parseClinicalTrialJson()`
4. `litvar`: `parseLitVarJson()`
5. `medgen`: `parseMedGenRrf()`
6. `clinvar`: `parseClinVarVcf()`
7. `snp`: `parseDbSnpVcf()`
8. `pubchem`: `parsePubchemLiteratureTsv()`
9. `cdd`: `parseCddDomains()`
10. `pmc`: S3 inventory parser for the new AWS-based PMC OA

---

## Relationship to Existing Offline Parsers

The [offline mode roadmap](./offline-mode.md) describes 8 new parser functions that convert bulk NCBI files into typed objects. The newly identified 13 parsers above extend that list. All parsers are Layer 1 — they are consumed by the sync engine internally:

### Tier 1: Literature sources

| Sync source         | Parser used                                          | FTP path                                     | Size      |
| ------------------- | ---------------------------------------------------- | -------------------------------------------- | --------- |
| `pubmed-source.ts`  | `createPubmedXmlStream()` from `@ncbijs/pubmed-xml`  | `/pubmed/baseline/` + `/pubmed/updatefiles/` | ~30 GB    |
| `pmc-source.ts`     | `parseJATS()` + `toChunks()` from `@ncbijs/jats`     | `s3://pmc-oa-opendata/`                      | ~350 GB   |
| `pmc-ids-source.ts` | `parsePmcIdsCsv()` from `@ncbijs/id-converter` (new) | `/pub/pmc/PMC-ids.csv.gz`                    | ~233 MB   |
| `icite-source.ts`   | New CSV parser                                       | Figshare snapshots                           | ~10-20 GB |

### Tier 2: NLP/AI annotation sources

| Sync source                  | Parser used                                             | FTP path                                     | Size       |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------- | ---------- |
| `pubtator-source.ts`         | `parsePubTatorTsv()` from `@ncbijs/pubtator` (existing) | `/pub/lu/PubTator3/bioconcepts2pubtator3.gz` | ~5.7 GB    |
| `pubtator-bioc-source.ts`    | `parseBioC()` from `@ncbijs/pubtator` (existing)        | `/pub/lu/PubTator3/BioCXML.*.tar.gz`         | ~200 GB    |
| `medcpt-source.ts`           | Binary embedding loader (new)                           | `/pub/lu/MedCPT/pubmed_embeddings/`          | Tens of GB |
| `litvar-source.ts`           | JSON parser (new)                                       | `/pub/lu/LitVar/litvar2_variants.json.gz`    | ~1.8 GB    |
| `computed-authors-source.ts` | JSON parser (new)                                       | `/pub/lu/ComputedAuthors/`                   | ~3.7 GB    |

### Tier 3: Vocabulary sources

| Sync source        | Parser used                                          | FTP path                           | Size    |
| ------------------ | ---------------------------------------------------- | ---------------------------------- | ------- |
| `mesh-source.ts`   | `parseMeshDescriptorXml()` from `@ncbijs/mesh` (new) | `nlmpubs.nlm.nih.gov/.../xmlmesh/` | ~360 MB |
| `medgen-source.ts` | RRF parser (new)                                     | `/pub/medgen/`                     | ~500 MB |
| `cdd-source.ts`    | Domain parser (new)                                  | `/pub/mmdb/cdd/`                   | ~4.3 GB |

### Tier 4: Variation sources

| Sync source         | Parser used                                             | FTP path                      | Size      |
| ------------------- | ------------------------------------------------------- | ----------------------------- | --------- |
| `clinvar-source.ts` | `parseVariantSummaryTsv()` from `@ncbijs/clinvar` (new) | `/pub/clinvar/tab_delimited/` | ~436 MB   |
| `dbsnp-source.ts`   | VCF parser (new)                                        | `/snp/latest_release/VCF/`    | ~15-20 GB |

### Tier 5: Gene & taxonomy sources

| Sync source             | Parser used                                         | FTP path                       | Size    |
| ----------------------- | --------------------------------------------------- | ------------------------------ | ------- |
| `gene-source.ts`        | `parseGeneInfoTsv()` from `@ncbijs/datasets` (new)  | `/gene/DATA/gene_info.gz`      | ~1.4 GB |
| `gene-pubmed-source.ts` | TSV parser (new)                                    | `/gene/DATA/gene2pubmed.gz`    | ~249 MB |
| `gene-go-source.ts`     | TSV parser (new)                                    | `/gene/DATA/gene2go.gz`        | ~1.2 GB |
| `taxonomy-source.ts`    | `parseTaxonomyDump()` from `@ncbijs/datasets` (new) | `/pub/taxonomy/taxdump.tar.gz` | ~69 MB  |

### Tier 6: Chemistry sources

| Sync source                    | Parser used                                          | FTP path                    | Size    |
| ------------------------------ | ---------------------------------------------------- | --------------------------- | ------- |
| `pubchem-source.ts`            | `parseCompoundExtras()` from `@ncbijs/pubchem` (new) | `/pubchem/Compound/Extras/` | ~15 GB  |
| `pubchem-literature-source.ts` | TSV parser (new)                                     | `/pubchem/Literature/`      | ~4.6 GB |

### Tier 7: Clinical sources

| Sync source                 | Parser used                                      | FTP path                                 | Size     |
| --------------------------- | ------------------------------------------------ | ---------------------------------------- | -------- |
| `clinical-trials-source.ts` | JSON parser (existing `@ncbijs/clinical-trials`) | `clinicaltrials.gov/api/v2/` or bulk ZIP | ~5-10 GB |

The offline parsers from [offline-mode.md](./offline-mode.md) (Phase 1) must be implemented first, then the sync engine and store interface can be built on top.

## Implementation Order

| Phase | What                                                          | Datasets                                                  | Depends on    |
| ----- | ------------------------------------------------------------- | --------------------------------------------------------- | ------------- |
| 1     | Offline parsers (7 new functions per offline-mode.md)         | mesh, cite, id-converter, clinvar, datasets, pubchem, snp | Nothing       |
| 2     | `@ncbijs/store` interface package                             | N/A (types only)                                          | Phase 1 types |
| 3     | `@ncbijs/sync` engine — Tier 1 sources                        | pubmed, pmc-ids                                           | Phase 1 + 2   |
| 4     | `examples/offline-duckdb/` reference implementation           | Demo with PubMed                                          | Phase 2 + 3   |
| 5     | Tier 2 sources: NLP/AI                                        | pubtator, medcpt-embeddings, litvar                       | Phase 3       |
| 6     | Tier 3-5 sources: vocabularies, variation, gene               | mesh, clinvar, gene, taxonomy                             | Phase 3       |
| 7     | Tier 6-7 sources: chemistry, clinical                         | pubchem, clinical-trials                                  | Phase 3       |
| 8     | PMC OA full-text source (S3-based)                            | pmc                                                       | Phase 3       |
| 9     | Documentation: Docker guide, backend comparison, RAG tutorial | N/A                                                       | Phase 4+      |

### What NOT to implement (user territory)

These are explicitly out of scope for ncbijs packages — they belong to the user's pipeline:

- Database schema creation and indexing
- Embedding model selection and inference
- Vector index building (HNSW, IVF, etc.)
- Search ranking and reranking strategies
- Cron/scheduler configuration
- Cloud infrastructure provisioning
- Data retention policies

The `examples/offline-duckdb/` reference implementation shows one opinionated way to wire these together, but the library stays agnostic.

## NCBI GitHub Repository Resources

Key repositories from the `ncbi` GitHub organization relevant to this architecture:

| Repository                                                  | Stars | What it provides                                              |
| ----------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| [ncbi/datasets](https://github.com/ncbi/datasets)           | 528   | Datasets CLI + REST API for genomes, genes, viruses, taxonomy |
| [ncbi/sra-tools](https://github.com/ncbi/sra-tools)         | 1326  | SRA Toolkit for sequence data access                          |
| [ncbi/dbsnp](https://github.com/ncbi/dbsnp)                 | 144   | dbSNP tools, JSON format specs, tutorials                     |
| [ncbi/clinvar](https://github.com/ncbi/clinvar)             | 83    | ClinVar data tools and prototypes                             |
| [ncbi/GeneGPT](https://github.com/ncbi/GeneGPT)             | 424   | Tool-augmented LLM using NCBI APIs (reference for RAG)        |
| [ncbi/MedCPT](https://github.com/ncbi/MedCPT)               | 249   | Contrastive pre-trained transformer for PubMed retrieval      |
| [ncbi/BioConceptVec](https://github.com/ncbi/BioConceptVec) | 43    | Biomedical concept embeddings (FastText/GloVe/Word2Vec)       |
| [ncbi/AIONER](https://github.com/ncbi/AIONER)               | 65    | All-in-one biomedical NER                                     |
| [ncbi/BioREx](https://github.com/ncbi/BioREx)               | 44    | Biomedical relation extraction                                |
| [ncbi/amr](https://github.com/ncbi/amr)                     | 359   | AMRFinderPlus for antimicrobial resistance                    |
| [ncbi/icn3d](https://github.com/ncbi/icn3d)                 | 172   | 3D protein structure viewer (Node.js compatible)              |
| [ncbi/pgap](https://github.com/ncbi/pgap)                   | 375   | Prokaryotic Genome Annotation Pipeline                        |
| [ncbi/fcs](https://github.com/ncbi/fcs)                     | 162   | Foreign Contamination Screening                               |

The `ncbi/MedCPT` repository is particularly relevant — it provides the model that generated the pre-computed embeddings at `/pub/lu/MedCPT/pubmed_embeddings/`. Using these embeddings directly would save users from running their own embedding pipeline.

## All 38 Entrez Databases

For completeness, these are all databases accessible via E-utilities (`eutils.ncbi.nlm.nih.gov`):

`annotinfo`, `assembly`, `biocollections`, `bioproject`, `biosample`, `blastdbinfo`, `books`, `cdd`, `clinvar`, `dbvar`, `gap`, `gapplus`, `gds`, `gene`, `genome`, `geoprofiles`, `grasp`, `gtr`, `ipg`, `medgen`, `mesh`, `nlmcatalog`, `nuccore`, `nucleotide`, `omim`, `orgtrack`, `pcassay`, `pccompound`, `pcsubstance`, `pmc`, `popset`, `protein`, `proteinclusters`, `protfam`, `pubmed`, `seqannot`, `snp`, `sra`, `structure`, `taxonomy`

Of these, the sync engine targets the subset that has bulk FTP/S3 downloads and is relevant to biomedical RAG pipelines.
