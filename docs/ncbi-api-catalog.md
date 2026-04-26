# NCBI API Catalog

Complete reference of all public NCBI/NLM HTTP APIs and bulk download endpoints. Use this to discover which APIs exist, what they offer, and whether ncbijs has a wrapper package.

Last verified: 2026-04-26.

## HTTP APIs

### E-utilities (Entrez Programming Utilities)

Gateway to all ~38 Entrez databases. Nine server-side programs share a single base URL.

| Endpoint  | URL                                                           | Description                                           |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| EInfo     | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi`    | Database metadata: field list, link list, last update |
| ESearch   | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`  | Text search returning UIDs                            |
| ESummary  | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` | Document summaries for a list of UIDs                 |
| EFetch    | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`   | Full records in XML, text, or ASN.1                   |
| ELink     | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi`    | Cross-database and within-database links              |
| EPost     | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/epost.fcgi`    | Upload UIDs to the History Server                     |
| EGQuery   | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/egquery.fcgi`  | Global search across all Entrez databases             |
| ESpell    | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/espell.fcgi`   | Spelling suggestions for search terms                 |
| ECitMatch | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/ecitmatch.cgi` | Batch citation-to-PMID matching                       |

Rate limits: 3 req/s without API key, 10 req/s with API key. Key param: `&api_key=`.

**ncbijs**: `@ncbijs/eutils` (core), plus per-database packages below.

#### Entrez databases accessible via E-utilities

Each database uses the E-utilities endpoints above with `db={name}`.

| Database     | `db=` param  | ncbijs package        | Notes                            |
| ------------ | ------------ | --------------------- | -------------------------------- |
| PubMed       | `pubmed`     | `@ncbijs/pubmed`      | 37M+ biomedical articles         |
| PMC          | `pmc`        | `@ncbijs/pmc`         | Full-text open access            |
| Gene         | `gene`       | `@ncbijs/datasets`    | Also in Datasets v2              |
| Nucleotide   | `nuccore`    | `@ncbijs/nucleotide`  | GenBank/RefSeq sequences         |
| Protein      | `protein`    | `@ncbijs/protein`     | Protein sequences                |
| Structure    | `structure`  | `@ncbijs/structure`   | 3D structures (MMDB)             |
| ClinVar      | `clinvar`    | `@ncbijs/clinvar`     | Clinical variant interpretations |
| dbSNP        | `snp`        | `@ncbijs/snp`         | Single nucleotide polymorphisms  |
| dbVar        | `dbvar`      | `@ncbijs/dbvar`       | Structural variants              |
| GEO DataSets | `gds`        | `@ncbijs/geo`         | Gene expression datasets         |
| SRA          | `sra`        | `@ncbijs/sra`         | Sequencing read archive          |
| OMIM         | `omim`       | `@ncbijs/omim`        | Mendelian inheritance            |
| MedGen       | `medgen`     | `@ncbijs/medgen`      | Medical genetics concepts        |
| GTR          | `gtr`        | `@ncbijs/gtr`         | Genetic testing registry         |
| Books        | `books`      | `@ncbijs/books`       | NCBI Bookshelf                   |
| NLM Catalog  | `nlmcatalog` | `@ncbijs/nlm-catalog` | Journal/serial records           |
| CDD          | `cdd`        | `@ncbijs/cdd`         | Conserved domains                |
| Taxonomy     | `taxonomy`   | `@ncbijs/datasets`    | Also in Datasets v2              |
| BioProject   | `bioproject` | `@ncbijs/datasets`    | Via Datasets v2                  |
| BioSample    | `biosample`  | `@ncbijs/datasets`    | Via Datasets v2                  |
| Assembly     | `assembly`   | `@ncbijs/datasets`    | Via Datasets v2                  |
| Genome       | `genome`     | `@ncbijs/datasets`    | Via Datasets v2                  |
| PopSet       | `popset`     | --                    | Population study sets            |
| HomoloGene   | `homologene` | --                    | Homology groups (legacy)         |
| Probe        | `probe`      | --                    | Molecular probes                 |

### NCBI Datasets v2

Modern REST API for genomic data. OpenAPI 3.0 spec available.

| Endpoint group      | URL pattern                                                                       | Description                    |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| Gene by ID          | `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/id/{ids}`                          | Gene metadata and downloads    |
| Gene by symbol      | `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/symbol/{symbols}/taxon/{taxon}`    | Gene lookup by symbol          |
| Gene by accession   | `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/accession/{accessions}`            | Gene lookup by accession       |
| Genome by accession | `https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/{accessions}`          | Assembly metadata              |
| Genome dataset      | `https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/{accessions}/download` | Download genome data package   |
| Taxonomy by taxon   | `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/taxon/{taxons}`                | Taxonomy metadata              |
| Taxonomy dataset    | `https://api.ncbi.nlm.nih.gov/datasets/v2/taxonomy/dataset/{taxons}`              | Download taxonomy data package |
| Virus by accession  | `https://api.ncbi.nlm.nih.gov/datasets/v2/virus/accession/{accessions}/download`  | Virus genome downloads         |
| Virus genome table  | `https://api.ncbi.nlm.nih.gov/datasets/v2/virus/genome/table`                     | Tabular virus genome data      |

OpenAPI spec: `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml`

Rate limits: 5 req/s default, 10 req/s with API key (use `api-key` header).

**ncbijs**: `@ncbijs/datasets`

### NCBI Variation Services (dbSNP)

REST API for SNP data, SPDI notation, and HGVS conversion.

| Endpoint   | URL                                                                     | Description                           |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------- |
| RefSNP     | `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/{rsid}`               | Full RefSNP record                    |
| Frequency  | `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/{rsid}/frequency`     | Allele frequencies across populations |
| SPDI       | `https://api.ncbi.nlm.nih.gov/variation/v0/spdi/{spdi}/contextual`      | SPDI contextual alleles               |
| HGVS       | `https://api.ncbi.nlm.nih.gov/variation/v0/hgvs/{hgvs}`                 | HGVS to SPDI conversion               |
| VCF fields | `https://api.ncbi.nlm.nih.gov/variation/v0/vcf/{chr}/{pos}/{ref}/{alt}` | VCF to SPDI conversion                |

OpenAPI spec: `https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml`

Rate limits: 1 req/s.

**ncbijs**: `@ncbijs/snp`

### ClinVar (beyond E-utilities)

| Endpoint  | URL                                                                 | Description                    |
| --------- | ------------------------------------------------------------------- | ------------------------------ |
| Frequency | `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/{rsid}/frequency` | Shared with Variation Services |

**ncbijs**: `@ncbijs/clinvar` (E-utilities search/summary + Variation API frequency)

### BLAST

| Endpoint             | URL                                              | Description                                 |
| -------------------- | ------------------------------------------------ | ------------------------------------------- |
| Submit/poll/retrieve | `https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi` | PUT to submit, GET to poll, GET to retrieve |

Rate limits: 1 request per 10 seconds, 1 RID poll per minute.

**ncbijs**: `@ncbijs/blast`

### PubChem

| Endpoint            | URL pattern                                                                                | Description                                |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| PUG-REST: compound  | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/{domain}/{identifier}/JSON`            | Compound data by CID, name, SMILES, InChI  |
| PUG-REST: substance | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/substance/{domain}/{identifier}/JSON`           | Substance data by SID                      |
| PUG-REST: assay     | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/assay/{domain}/{identifier}/JSON`               | Bioassay data by AID                       |
| PUG-REST: property  | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cids}/property/{properties}/JSON` | Specific computed properties               |
| PUG-REST: synonyms  | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON`               | Compound name synonyms                     |
| PUG-REST: xrefs     | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/xrefs/{xref_type}/JSON`      | Cross-references                           |
| PUG-View            | `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON`                  | Annotation data (pharma, tox, safety)      |
| SDQ Agent           | `https://pubchem.ncbi.nlm.nih.gov/sdq/sdqagent.cgi`                                        | Structured data queries across collections |

Rate limits: 5 requests per second, no more than 400 per minute.

**ncbijs**: `@ncbijs/pubchem` (PUG-REST compound/substance/assay)

### ClinicalTrials.gov v2

| Endpoint            | URL                                                   | Description                            |
| ------------------- | ----------------------------------------------------- | -------------------------------------- |
| Studies search      | `https://clinicaltrials.gov/api/v2/studies`           | Search clinical trial records          |
| Study by NCT ID     | `https://clinicaltrials.gov/api/v2/studies/{nctId}`   | Single study record                    |
| Study enums         | `https://clinicaltrials.gov/api/v2/studies/metadata`  | Enumeration values for study fields    |
| Stats: field values | `https://clinicaltrials.gov/api/v2/stats/fieldValues` | Statistics on field value distribution |
| Stats: field sizes  | `https://clinicaltrials.gov/api/v2/stats/fieldSizes`  | Statistics on field sizes              |
| Stats: list sizes   | `https://clinicaltrials.gov/api/v2/stats/listSizes`   | Statistics on list field sizes         |
| Version             | `https://clinicaltrials.gov/api/v2/version`           | API and data version info              |

Rate limits: ~50 req/min.

**ncbijs**: `@ncbijs/clinical-trials`

### NIH iCite

| Endpoint           | URL                                               | Description                   |
| ------------------ | ------------------------------------------------- | ----------------------------- |
| Single publication | `https://icite.od.nih.gov/api/pubs/{pmid}`        | Citation metrics for one PMID |
| Batch publications | `https://icite.od.nih.gov/api/pubs?pmids={pmids}` | Metrics for up to 1000 PMIDs  |

**ncbijs**: `@ncbijs/icite`

### RxNorm and related drug APIs

| Endpoint               | URL                                                                            | Description               |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------- |
| RxNorm: RxCUI lookup   | `https://rxnav.nlm.nih.gov/REST/rxcui.json?name={name}`                        | Drug name to RxCUI        |
| RxNorm: properties     | `https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json`                 | Drug concept properties   |
| RxNorm: related        | `https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/related.json?tty={tty}`          | Related concepts by TTY   |
| RxNorm: NDC            | `https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/ndcs.json`                       | NDC codes for a drug      |
| RxNorm: allrelated     | `https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/allrelated.json`                 | All related concepts      |
| RxNorm: version        | `https://rxnav.nlm.nih.gov/REST/version.json`                                  | Data and API version      |
| RxClass: by class      | `https://rxnav.nlm.nih.gov/REST/rxclass/classMembers.json?classId={id}`        | Drugs in a class          |
| RxClass: by drug       | `https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName={name}` | Classes for a drug        |
| Drug interaction       | `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui={rxcui}`    | Drug-drug interactions    |
| Drug interaction: list | `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={rxcuis}`         | Interactions among a list |

Rate limits: 20 req/s.

**ncbijs**: `@ncbijs/rxnorm` (core RxNorm only; RxClass and interaction endpoints not wrapped)

### LitVar2

| Endpoint     | URL                                                                                     | Description                       |
| ------------ | --------------------------------------------------------------------------------------- | --------------------------------- |
| Search       | `https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/search/?query={rsid}`        | Search publications for a variant |
| Autocomplete | `https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/autocomplete/?query={query}` | Variant name disambiguation       |

**ncbijs**: `@ncbijs/litvar`

### MeSH

| Endpoint          | URL                                                                               | Description                  |
| ----------------- | --------------------------------------------------------------------------------- | ---------------------------- |
| Descriptor lookup | `https://id.nlm.nih.gov/mesh/lookup/descriptor?label={term}&match=exact&limit=10` | MeSH descriptor search       |
| Pair lookup       | `https://id.nlm.nih.gov/mesh/lookup/pair?label={term}&limit=10`                   | MeSH qualifier pairs         |
| SPARQL            | `https://id.nlm.nih.gov/mesh/sparql?query={sparql}&format=JSON`                   | SPARQL queries over MeSH RDF |

Swagger spec: `https://id.nlm.nih.gov/mesh/swagger/swagger.json`

**ncbijs**: `@ncbijs/mesh`

### PMC ID Converter

| Endpoint | URL                                                                                | Description                   |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| Convert  | `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids={ids}&format=json` | PMID/PMCID/DOI/MID conversion |

Up to 200 IDs per request.

**ncbijs**: `@ncbijs/id-converter`

### Literature Citation Exporter

| Endpoint        | URL                                                                          | Description        |
| --------------- | ---------------------------------------------------------------------------- | ------------------ |
| PubMed citation | `https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?id={pmid}&format={format}` | Formatted citation |
| PMC citation    | `https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pmc/?id={pmcid}&format={format}`   | Formatted citation |

Formats: `ris`, `medline`, `csl`, `citation`.

**ncbijs**: `@ncbijs/cite`

### PubTator3

| Endpoint            | URL                                                                                              | Description                     |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| Export annotations  | `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/pubtator?pmids={pmids}` | BioC/PubTator annotation export |
| Search              | `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/search/?text={query}`                       | Search articles by entity       |
| Entity autocomplete | `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/entity/autocomplete/?query={query}`         | Entity name resolution          |
| Free-text annotate  | `POST https://www.ncbi.nlm.nih.gov/research/pubtator3-api/annotate/`                             | Annotate arbitrary text         |

**ncbijs**: `@ncbijs/pubtator`

### BioC (Annotated Full Text)

| Endpoint    | URL                                                                                        | Description             |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------- |
| PubMed BioC | `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pubmed.cgi/BioC_json/{pmid}/unicode` | PubMed abstract in BioC |
| PMC BioC    | `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/{pmcid}/unicode` | PMC full text in BioC   |

**ncbijs**: `@ncbijs/bioc`

### Clinical Table Search Service

| Endpoint       | URL pattern                                                                          | Description                         |
| -------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| Autocomplete   | `https://clinicaltables.nlm.nih.gov/api/{table}/v3/search?terms={query}`             | Autocomplete/search                 |
| Display fields | `https://clinicaltables.nlm.nih.gov/api/{table}/v3/search?terms={query}&df={fields}` | Search with specific display fields |

Tables: `icd10cm`, `icd9cm_dx`, `loinc_items`, `snomed_ct`, `hcpcs`, `hpo`, `conditions`, `drug_ingredients`, `rxterms`, `genes`, `ncbi_genes`, `clinvar_variants`, `cosmic`, `dbvar`, `refseq`, `snps`, and more.

**ncbijs**: `@ncbijs/clinical-tables`

### PMC Open Access

| Endpoint        | URL                                                                                                       | Description                 |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- |
| OA file listing | `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id={pmcid}`                                            | Discover OA download links  |
| OAI-PMH         | `https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/?verb=GetRecord&identifier=oai:pubmedcentral.nih.gov:{pmcid}` | OAI-PMH metadata harvesting |

**ncbijs**: `@ncbijs/pmc` (E-utilities + S3 access; OA service and OAI-PMH not directly wrapped)

### UMLS Terminology Services (requires UMLS license)

| Endpoint       | URL                                                                      | Description                 |
| -------------- | ------------------------------------------------------------------------ | --------------------------- |
| Auth           | `https://utslogin.nlm.nih.gov/cas/v1/api-key`                            | Ticket-granting-ticket auth |
| Concept lookup | `https://uts-ws.nlm.nih.gov/rest/content/current/CUI/{cui}`              | UMLS concept by CUI         |
| Search         | `https://uts-ws.nlm.nih.gov/rest/search/current?string={term}`           | Full-text search            |
| Crosswalk      | `https://uts-ws.nlm.nih.gov/rest/crosswalk/current/source/{source}/{id}` | Map between vocabularies    |

**ncbijs**: -- (requires UMLS license; not wrapped)

### DailyMed v2

| Endpoint      | URL                                                                                 | Description         |
| ------------- | ----------------------------------------------------------------------------------- | ------------------- |
| SPL by set ID | `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setId}.json`               | Drug label (SPL)    |
| Drug names    | `https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name={name}` | Drug name search    |
| NDC lookup    | `https://dailymed.nlm.nih.gov/dailymed/services/v2/ndcs.json?ndc={ndc}`             | NDC code lookup     |
| Drug classes  | `https://dailymed.nlm.nih.gov/dailymed/services/v2/drugclasses.json`                | Drug classification |

**ncbijs**: -- (not wrapped)

### ClinVar Submission API (write-only)

| Endpoint | URL                                                                | Description              |
| -------- | ------------------------------------------------------------------ | ------------------------ |
| Submit   | `https://submit.ncbi.nlm.nih.gov/api/v1/submissions/`              | POST variant submissions |
| Status   | `https://submit.ncbi.nlm.nih.gov/api/v1/submissions/{id}/actions/` | Check submission status  |

Requires SP-API-KEY header. This is a write API for submitting data to ClinVar.

**ncbijs**: -- (write API; not in scope for a read-only SDK)

### Other experimental/niche APIs

| Endpoint                | URL                                                             | Description                                 | ncbijs |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------- | ------ |
| BioC FAIR-SMart         | `https://www.ncbi.nlm.nih.gov/research/bionlp/APIs/FAIR-SMart/` | PMC supplementary materials in BioC         | --     |
| PubMed Computed Authors | `https://www.ncbi.nlm.nih.gov/research/bionlp/APIs/authors/`    | Author name disambiguation                  | --     |
| VSAC FHIR               | `https://cts.nlm.nih.gov/fhir/`                                 | Value set/code system lookup (UMLS license) | --     |

---

## Bulk download endpoints

### FTP / HTTPS download sites

| Dataset                    | Download URL                                                                                  | Format     | Size    | Update         |
| -------------------------- | --------------------------------------------------------------------------------------------- | ---------- | ------- | -------------- |
| PubMed baseline            | `https://ftp.ncbi.nlm.nih.gov/pubmed/baseline/`                                               | XML.gz     | ~35 GB  | Annual + daily |
| PubMed daily updates       | `https://ftp.ncbi.nlm.nih.gov/pubmed/updatefiles/`                                            | XML.gz     | varies  | Daily          |
| MeSH descriptors           | `https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml`                   | XML        | ~360 MB | Annual         |
| MeSH supplementary         | `https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/supp2025.xml`                   | XML        | ~115 MB | Annual         |
| PubTator3 annotations      | `https://ftp.ncbi.nlm.nih.gov/pub/lu/PubTator3/`                                              | TSV.gz     | ~12 GB  | Weekly         |
| ClinVar variant summary    | `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz`               | TSV.gz     | ~150 MB | Weekly         |
| ClinVar submission summary | `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/submission_summary.txt.gz`            | TSV.gz     | ~80 MB  | Weekly         |
| ClinVar VCF                | `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz`                          | VCF.gz     | ~50 MB  | Weekly         |
| dbSNP JSON                 | `https://ftp.ncbi.nlm.nih.gov/snp/latest_release/JSON/`                                       | JSON.bz2   | ~200 GB | Annual         |
| dbSNP VCF                  | `https://ftp.ncbi.nlm.nih.gov/snp/latest_release/VCF/`                                        | VCF.gz     | ~20 GB  | Annual         |
| PubChem compound extras    | `https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/`                                       | TSV        | ~15 GB  | Weekly         |
| PubChem CID-PMID mapping   | `https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-PMID.gz`                            | TSV.gz     | ~2 GB   | Weekly         |
| Gene info                  | `https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz`                                         | TSV.gz     | ~600 MB | Daily          |
| Gene2pubmed                | `https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene2pubmed.gz`                                       | TSV.gz     | ~150 MB | Daily          |
| Gene2refseq                | `https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene2refseq.gz`                                       | TSV.gz     | ~800 MB | Daily          |
| Taxonomy dump              | `https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/taxdump.tar.gz`                                    | TSV.tar.gz | ~80 MB  | Daily          |
| Taxonomy new dump          | `https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/new_taxdump/new_taxdump.tar.gz`                    | TSV.tar.gz | ~150 MB | Daily          |
| iCite bulk                 | `https://icite.od.nih.gov/api/pubs?fl=pmid,year,title,doi,relative_citation_ratio&format=csv` | CSV        | ~4 GB   | Monthly        |
| PMC ID mapping             | `https://ftp.ncbi.nlm.nih.gov/pub/pmc/PMC-ids.csv.gz`                                         | CSV.gz     | ~233 MB | Regular        |
| PMC OA bulk (S3)           | `https://pmc-oa-opendata.s3.amazonaws.com/oa_comm/xml/all/`                                   | JATS XML   | ~700 GB | Daily          |
| PMC OA file list           | `https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_file_list.csv`                                       | CSV        | ~500 MB | Daily          |
| BLAST databases            | `https://ftp.ncbi.nlm.nih.gov/blast/db/`                                                      | Binary     | ~1 TB   | Daily          |
| CDD domain list            | `https://ftp.ncbi.nlm.nih.gov/pub/cdd/`                                                       | Various    | ~5 GB   | Periodic       |
| UniGene                    | `https://ftp.ncbi.nlm.nih.gov/repository/UniGene/`                                            | Various    | legacy  | Archived       |
| RefSeq release             | `https://ftp.ncbi.nlm.nih.gov/refseq/release/`                                                | FASTA/GBK  | ~1.5 TB | Bimonthly      |
| HomoloGene                 | `https://ftp.ncbi.nlm.nih.gov/pub/HomoloGene/current/`                                        | TSV        | ~50 MB  | Periodic       |
| BioProject XML             | `https://ftp.ncbi.nlm.nih.gov/bioproject/`                                                    | XML        | ~2 GB   | Daily          |
| BioSample XML              | `https://ftp.ncbi.nlm.nih.gov/biosample/`                                                     | XML        | ~50 GB  | Daily          |

### AWS S3 open data

| Dataset            | Bucket / Path                              | Description                          |
| ------------------ | ------------------------------------------ | ------------------------------------ |
| PMC Open Access    | `s3://pmc-oa-opendata/oa_comm/xml/all/`    | PMC OA full text (JATS XML)          |
| PMC non-commercial | `s3://pmc-oa-opendata/oa_noncomm/xml/all/` | PMC non-commercial license           |
| PMC other          | `s3://pmc-oa-opendata/oa_other/xml/all/`   | PMC other licenses                   |
| SRA                | `s3://sra-pub-run-odp/`                    | SRA public run data                  |
| BLAST databases    | `s3://ncbi-blast-databases/`               | Preformatted BLAST DBs               |
| dbGaP              | `s3://dbgap-controlled-access/`            | Controlled-access genotype/phenotype |

### RxNorm bulk downloads

| Dataset             | URL                                                                              | Description                                 |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| RxNorm full         | `https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_current.zip`           | Full RxNorm release (requires UMLS license) |
| RxNorm prescribable | `https://download.nlm.nih.gov/umls/kss/rxnorm/RxNorm_full_prescribe_current.zip` | Prescribable content subset                 |

### ClinicalTrials.gov bulk

| Dataset       | URL                                                    | Description                |
| ------------- | ------------------------------------------------------ | -------------------------- |
| Full download | `https://clinicaltrials.gov/AllPublicXML.zip`          | All studies as XML (~7 GB) |
| API bulk      | `https://clinicaltrials.gov/api/v2/studies?format=csv` | CSV export via API         |

---

## Coverage summary

| Status                    | Count       | Details                                                                                  |
| ------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| Wrapped in ncbijs         | 33 packages | All major NCBI APIs covered                                                              |
| Not wrapped (niche)       | 5           | BioC FAIR-SMart, PubMed Computed Authors, PubChem SDQ Agent, PMC OAI-PMH, PMC OA Service |
| Not wrapped (gated)       | 2           | UMLS Terminology Services, VSAC FHIR (require UMLS license)                              |
| Not wrapped (write-only)  | 1           | ClinVar Submission API                                                                   |
| Not wrapped (independent) | 2           | DailyMed v2, RxClass/Drug Interaction                                                    |
