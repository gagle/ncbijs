# NCBI Database Coverage Plan

Roadmap for expanding ncbijs to cover the full NCBI ecosystem.

## Current coverage

### Covered databases (10/32)

| NCBI Database    | Package                             | API used                           |
| ---------------- | ----------------------------------- | ---------------------------------- |
| PubMed           | `@ncbijs/pubmed` + `@ncbijs/eutils` | E-utilities                        |
| PMC              | `@ncbijs/pmc`                       | E-utilities + OA Service + OAI-PMH |
| Gene             | `@ncbijs/datasets`                  | Datasets API v2                    |
| Genome           | `@ncbijs/datasets`                  | Datasets API v2                    |
| Assembly         | `@ncbijs/datasets`                  | Datasets API v2                    |
| Taxonomy         | `@ncbijs/datasets`                  | Datasets API v2                    |
| ClinVar          | `@ncbijs/clinvar`                   | E-utilities (ESearch + ESummary)   |
| SNP              | `@ncbijs/snp`                       | Variation Services API             |
| MeSH             | `@ncbijs/mesh`                      | SPARQL + Lookup API                |
| PubChem Compound | `@ncbijs/pubchem`                   | PUG REST API                       |

### Covered tools (4)

| Tool              | Package                | API used                     |
| ----------------- | ---------------------- | ---------------------------- |
| BLAST             | `@ncbijs/blast`        | BLAST URL API                |
| PubTator3         | `@ncbijs/pubtator`     | PubTator3 API + BioC         |
| Citation Exporter | `@ncbijs/cite`         | Literature Citation Exporter |
| ID Converter      | `@ncbijs/id-converter` | PMC ID Converter API         |

### Support packages (5)

| Package                | Purpose                              |
| ---------------------- | ------------------------------------ |
| `@ncbijs/pubmed-xml`   | PubMed/MEDLINE XML parser            |
| `@ncbijs/jats`         | JATS full-text parser + RAG chunking |
| `@ncbijs/fasta`        | FASTA sequence parser                |
| `@ncbijs/xml`          | Zero-dep XML reader                  |
| `@ncbijs/rate-limiter` | Token bucket rate limiter            |

## Expansion plan

### Phase 1 — Extend existing packages

No new packages. Add methods and interfaces to packages that already exist.

#### pubchem: add Substance and BioAssay

The PUG REST API already supports substance and bioassay endpoints. Same base URL, same rate limiter, same error handling.

**New methods:**

```typescript
// Substance
substanceBySid(sid: number): Promise<SubstanceRecord>
substanceBySidBatch(sids: ReadonlyArray<number>): Promise<ReadonlyArray<SubstanceRecord>>
substanceByName(name: string): Promise<SubstanceRecord>
sidsByName(name: string): Promise<ReadonlyArray<number>>

// BioAssay
assayByAid(aid: number): Promise<AssayRecord>
assayByAidBatch(aids: ReadonlyArray<number>): Promise<ReadonlyArray<AssayRecord>>
assaySummary(aid: number): Promise<AssaySummary>
```

**New interfaces:** `SubstanceRecord`, `AssayRecord`, `AssaySummary`
**API:** PUG REST (`/compound/`, `/substance/`, `/assay/`)
**Covers:** PubChem Substance, PubChem BioAssay

#### datasets: add Virus, BioProject, BioSample

The Datasets API v2 already has endpoints for these. Same client, same auth, same rate limiter.

**New methods:**

```typescript
// Virus
virusByAccession(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<VirusReport>>
virusByTaxon(taxon: number | string): Promise<ReadonlyArray<VirusReport>>

// BioProject (via Datasets API v2)
bioproject(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<BioProjectReport>>

// BioSample (via Datasets API v2)
biosample(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<BioSampleReport>>
```

**New interfaces:** `VirusReport`, `BioProjectReport`, `BioSampleReport`
**API:** Datasets API v2 (`/virus/`, via gene/genome endpoints for project/sample metadata)
**Covers:** BioProject, BioSample (partially)

### Phase 2 — Sequence databases

New packages for protein and nucleotide sequences. These are the two most fundamental NCBI databases after PubMed.

#### @ncbijs/protein

Typed client for protein sequence retrieval from NCBI Protein database (GenBank, RefSeq, SwissProt).

**API:** E-utilities (EFetch db=protein) + Datasets API v2 (protein by accession)
**Dependencies:** `@ncbijs/eutils`, `@ncbijs/fasta`

```typescript
import { Protein } from '@ncbijs/protein';

const protein = new Protein(config);

// Fetch sequence in FASTA format
const fasta = await protein.fetchFasta('NP_000537.3');

// Fetch GenBank flat file
const genbank = await protein.fetchGenBank('NP_000537.3');

// Fetch batch by accession
const records = await protein.fetchBatch(['NP_000537.3', 'NP_001361187.1']);

// Search protein database
const results = await protein.search('tumor suppressor p53 [Homo sapiens]');
```

**Interfaces:** `ProteinRecord` (accession, definition, organism, sequence, length, features, dbxrefs)
**Offline parser:** `parseGenBankFlat(text: string): ReadonlyArray<ProteinRecord>`
**FTP source:** `https://ftp.ncbi.nlm.nih.gov/refseq/H_sapiens/mRNA_Prot/` (per-organism)

#### @ncbijs/nucleotide

Typed client for nucleotide sequence retrieval from NCBI Nucleotide database.

**API:** E-utilities (EFetch db=nucleotide) + Datasets API v2
**Dependencies:** `@ncbijs/eutils`, `@ncbijs/fasta`

```typescript
import { Nucleotide } from '@ncbijs/nucleotide';

const nucleotide = new Nucleotide(config);

// Fetch sequence in FASTA
const fasta = await nucleotide.fetchFasta('NM_007294.4');

// Fetch GenBank record
const record = await nucleotide.fetchGenBank('NM_007294.4');

// Search
const results = await nucleotide.search('BRCA1 mRNA [Homo sapiens]');
```

**Interfaces:** `NucleotideRecord` (accession, definition, organism, sequence, length, features, topology, moleculeType)
**Offline parser:** `parseGenBankFlat(text: string): ReadonlyArray<NucleotideRecord>` (shared format with protein)
**FTP source:** `https://ftp.ncbi.nlm.nih.gov/refseq/H_sapiens/mRNA_Prot/`

#### Shared: @ncbijs/genbank

Both protein and nucleotide use GenBank flat file format. Extract a shared parser.

```typescript
import { parseGenBank } from '@ncbijs/genbank';

const records = parseGenBank(text);
// Each record: { locus, definition, accession, version, dbSource, keywords,
//                source, organism, references[], features[], origin (sequence) }
```

**Zero dependencies.** Pure parser like fasta, xml, pubmed-xml.

### Phase 3 — Clinical and medical genetics

New packages for the clinical genetics ecosystem. These databases interconnect heavily with ClinVar, SNP, and Gene.

#### @ncbijs/omim

Online Mendelian Inheritance in Man. The primary catalog of human genes and genetic disorders.

**API:** OMIM API (https://api.omim.org/api) — requires free API key
**Dependencies:** `@ncbijs/rate-limiter`

```typescript
import { OMIM } from '@ncbijs/omim';

const omim = new OMIM({ apiKey: process.env.OMIM_API_KEY });

// Lookup by MIM number
const entry = await omim.entry(113705); // BRCA2

// Search
const results = await omim.search('breast cancer susceptibility');

// Gene map
const geneMap = await omim.geneMap({ chromosome: '17' });
```

**Interfaces:** `OmimEntry` (mimNumber, title, status, geneSymbols, phenotypes, references, textSections), `OmimPhenotype`, `OmimGeneMap`
**FTP source:** `https://data.omim.org/downloads/` (requires registration, ~50 MB)
**Note:** OMIM data redistribution requires a license. The API is free for academic use.

#### @ncbijs/medgen

Medical Genetics concepts. Links diseases to genes, variants, and clinical tests.

**API:** E-utilities (EFetch db=medgen, rettype=docsum)
**Dependencies:** `@ncbijs/eutils`

```typescript
import { MedGen } from '@ncbijs/medgen';

const medgen = new MedGen(config);

// Lookup by CUI (Concept Unique Identifier)
const concept = await medgen.fetch('C0006142'); // Breast cancer

// Search by name
const results = await medgen.search('hereditary breast cancer');

// Get associated genes
const genes = await medgen.associatedGenes('C0006142');
```

**Interfaces:** `MedGenConcept` (cui, name, definition, semanticType, sources, associatedGenes, associatedVariants)
**FTP source:** `https://ftp.ncbi.nlm.nih.gov/pub/medgen/` (~200 MB, TSV files)

#### @ncbijs/gtr

Genetic Testing Registry. Catalog of genetic tests and their clinical validity.

**API:** GTR API (https://www.ncbi.nlm.nih.gov/gtr/docs/api/)
**Dependencies:** `@ncbijs/rate-limiter`

```typescript
import { GTR } from '@ncbijs/gtr';

const gtr = new GTR();

// Search tests by gene
const tests = await gtr.searchByGene('BRCA1');

// Search tests by condition
const tests = await gtr.searchByCondition('hereditary breast cancer');

// Get test details
const test = await gtr.fetch('GTR000500003');
```

**Interfaces:** `GeneticTest` (gtrAccession, testName, laboratory, methodology, analyticalValidity, clinicalValidity, genes, conditions)

### Phase 4 — Expression and variation

#### @ncbijs/geo

Gene Expression Omnibus. Microarray and RNA-seq expression data.

**API:** GEO API + E-utilities (db=gds for DataSets, db=geoprofiles for Profiles)
**Dependencies:** `@ncbijs/eutils`

```typescript
import { GEO } from '@ncbijs/geo';

const geo = new GEO(config);

// Search datasets
const datasets = await geo.searchDatasets('breast cancer RNA-seq');

// Fetch series metadata
const series = await geo.fetchSeries('GSE12345');

// Fetch sample metadata
const sample = await geo.fetchSample('GSM12345');

// Fetch platform
const platform = await geo.fetchPlatform('GPL570');
```

**Interfaces:** `GeoSeries` (accession, title, summary, overallDesign, samples, platforms, supplementaryFiles), `GeoSample`, `GeoPlatform`
**FTP source:** `https://ftp.ncbi.nlm.nih.gov/geo/` (~20+ TB total, individual series are small)
**Covers:** GEO DataSets, GEO Profiles

#### @ncbijs/dbvar

Database of Structural Variation. Copy number variants, inversions, translocations.

**API:** E-utilities (db=dbvar) + Datasets API v2
**Dependencies:** `@ncbijs/eutils`

```typescript
import { DbVar } from '@ncbijs/dbvar';

const dbvar = new DbVar(config);

// Search structural variants by region
const variants = await dbvar.searchByRegion('chr17', 41196312, 41277500);

// Fetch variant by accession
const variant = await dbvar.fetch('nsv530705');
```

**Interfaces:** `StructuralVariant` (accession, variantType, chromosome, start, stop, length, clinicalSignificance, studies)
**FTP source:** `https://ftp.ncbi.nlm.nih.gov/pub/dbVar/data/` (~5 GB)

#### @ncbijs/sra

Sequence Read Archive metadata. Does not download raw sequencing data (terabytes per study) but provides typed access to run/experiment/study metadata.

**API:** E-utilities (db=sra) + SRA API
**Dependencies:** `@ncbijs/eutils`

```typescript
import { SRA } from '@ncbijs/sra';

const sra = new SRA(config);

// Search runs
const runs = await sra.search('RNA-seq Homo sapiens BRCA1');

// Fetch run metadata
const run = await sra.fetchRun('SRR12345678');

// Fetch experiment
const experiment = await sra.fetchExperiment('SRX12345678');

// Fetch study
const study = await sra.fetchStudy('SRP12345678');
```

**Interfaces:** `SraRun` (accession, spots, bases, size, publishedDate, organism, libraryStrategy, platform), `SraExperiment`, `SraStudy`
**Note:** Raw data download requires the SRA Toolkit (C binary). This package handles metadata only.

### Phase 5 — Structural and domain databases

#### @ncbijs/structure

3D molecular structures from MMDB (Molecular Modeling Database) and PDB.

**API:** E-utilities (db=structure) + MMDB API
**Dependencies:** `@ncbijs/eutils`

```typescript
import { Structure } from '@ncbijs/structure';

const structure = new Structure(config);

// Search structures
const results = await structure.search('p53 DNA binding domain');

// Fetch structure metadata
const record = await structure.fetch('1TSR');

// Get PDB file
const pdb = await structure.fetchPdb('1TSR');
```

**Interfaces:** `StructureRecord` (pdbId, title, resolution, experimentMethod, organisms, chains, ligands, depositionDate)

#### @ncbijs/cdd

Conserved Domain Database. Protein domain annotations and search.

**API:** CD-Search API (https://www.ncbi.nlm.nih.gov/Structure/cdd/wrpsb.cgi) + batch CD-Search
**Dependencies:** `@ncbijs/rate-limiter`

```typescript
import { CDD } from '@ncbijs/cdd';

const cdd = new CDD();

// Search domains in a protein sequence
const domains = await cdd.search('MEEPQSDPSVEPPLSQETFSDLWK...');

// Fetch domain family info
const family = await cdd.fetchFamily('cd00028');
```

**Interfaces:** `DomainHit` (accession, name, description, evalue, from, to, superfamily), `DomainFamily`

### Phase 6 — Remaining databases

#### @ncbijs/books

NCBI Bookshelf. Full-text access to biomedical textbooks and reports.

**API:** E-utilities (db=books, EFetch returns XML)
**Dependencies:** `@ncbijs/eutils`

```typescript
import { Books } from '@ncbijs/books';

const books = new Books(config);

const results = await books.search('gene therapy CRISPR');
const chapter = await books.fetchChapter('NBK279467');
```

#### @ncbijs/nlm-catalog

NLM Catalog. Journal and book metadata.

**API:** E-utilities (db=nlmcatalog)
**Dependencies:** `@ncbijs/eutils`

```typescript
import { NlmCatalog } from '@ncbijs/nlm-catalog';

const catalog = new NlmCatalog(config);

const journal = await catalog.search('Nature Medicine');
const record = await catalog.fetch('101613227');
```

### Not planned

| Database                             | Reason                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| dbGaP                                | Controlled access — requires NIH authorization per dataset |
| Identical Protein Groups             | Low demand — specialized deduplication view                |
| Protein Clusters                     | Low demand — deprecated in favor of CDD                    |
| Protein Family Models                | Low demand — specialized bioinformatics                    |
| Biocollections                       | Low demand — specimen/culture tracking                     |
| ToolKit / ToolKitAll / ToolKitBookgh | Not data — NCBI C++ Toolkit developer docs                 |

## Package dependency graph (expanded)

```
xml ──────────────┬─ pubmed-xml ──┐
                  ├─ jats ────────┤
rate-limiter ─────┤               │
                  ├─ eutils ──┬─ pubmed (+ pubmed-xml)
                  │           ├─ pmc (+ jats)
                  │           ├─ clinvar
                  │           ├─ medgen          [new]
                  │           ├─ geo             [new]
                  │           ├─ dbvar           [new]
                  │           ├─ sra             [new]
                  │           ├─ structure       [new]
                  │           ├─ cdd             [new]
                  │           ├─ books           [new]
                  │           └─ nlm-catalog     [new]
                  ├─ pubtator
                  ├─ datasets (+ virus, bioproject, biosample)
                  ├─ blast
                  ├─ snp
                  ├─ pubchem (+ substance, bioassay)
                  ├─ omim                        [new]
                  └─ gtr                         [new]

genbank                                          [new, zero-dep parser]
fasta, id-converter, mesh, cite  (zero-dep, independent)
```

## Implementation priority

| Phase | Packages                          | New databases covered                           | Effort |
| ----- | --------------------------------- | ----------------------------------------------- | ------ |
| 1     | Extend pubchem, datasets          | +4 (Substance, BioAssay, BioProject, BioSample) | Small  |
| 2     | New: protein, nucleotide, genbank | +2 (Protein, Nucleotide)                        | Medium |
| 3     | New: omim, medgen, gtr            | +3 (OMIM, MedGen, GTR)                          | Medium |
| 4     | New: geo, dbvar, sra              | +4 (GEO DataSets, GEO Profiles, dbVar, SRA)     | Medium |
| 5     | New: structure, cdd               | +2 (Structure, Conserved Domains)               | Small  |
| 6     | New: books, nlm-catalog           | +2 (Books, NLM Catalog)                         | Small  |

**Total: 17 new databases covered across 6 phases, bringing coverage from 10/32 to 27/32 (84%).**

The 5 remaining (dbGaP, Identical Protein Groups, Protein Clusters, Protein Family Models, Biocollections) are either access-restricted or too specialized to justify a dedicated package.

## Coverage after full expansion

```
Covered:     27/32 databases (84%)
Not planned:  5/32 databases (16%) — access-restricted or deprecated
Tools:        4 utility tools
Parsers:      6 offline parsers (fasta, xml, pubmed-xml, jats, genbank, rate-limiter)
```
