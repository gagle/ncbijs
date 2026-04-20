# @ncbijs/pubtator — Text Mining & Entity Annotations Spec Reference

## Overview

Unified client for PubTator/BioC APIs: entity search, relation discovery, annotated article export, custom text NER, BioC format parser. Zero dependencies.

## 3 API Layers

### Layer A: PubTator3 Search API

**Base URL:** `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/`
**OpenAPI reference:** `ncbi-nlp/pubtator-gpt` repo
**Rate limit:** 3 requests/second

#### Entity Autocomplete

```
GET /entity/autocomplete/?query={text}&limit={n}
```

Returns entity matches with normalized IDs.

#### Relations

```
GET /relations?e1={entityId}&type={type}&e2={targetType}
```

- Entity ID format: `@ENTITY_TYPE_Name` (e.g., `@GENE_IL6`)
- Returns top-5 related entities

**13 relation types:**
treat, cause, cotreat, convert, compare, interact, associate,
positive_correlate, negative_correlate, prevent, inhibit, stimulate, drug_interact

#### Search

```
GET /search/?text={query}&page={n}&page_size={n}
```

- Query accepts: keywords | `@ENTITY_ID` | `relations:type|@E1|@E2`
- `page_size` max 200, max 1000 total results

### Layer B: PubTator Export API

**Base URL:** `https://www.ncbi.nlm.nih.gov/research/pubtator-api/`

```
GET /publications/export/biocjson?pmids={ids}&full={true|false}
GET /publications/export/biocxml?pmids={ids}&full={true|false}
```

- `full=true` → full-text annotations (PMC articles only)
- `full=false` → abstract annotations only (PubMed)

### Layer C: PubTator Legacy API (EXPERIMENTAL)

**Base URL:** `https://www.ncbi.nlm.nih.gov/CBBresearch/Lu/Demo/RESTful/tmTool.cgi/`

⚠️ URL contains `/Demo/` — operational status uncertain in 2026. Include with deprecation warning.

#### Pre-tagged retrieval

```
GET /{concept}/{pmids}/{format}/
```

#### Custom text annotation (session-based)

```
POST /{concept}/Submit/ → sessionId
GET /{sessionId}/Receive/ → result (poll with backoff)
```

**6 concept types:** Gene, Disease, Chemical, Mutation, Species, BioConcept
**3 output formats:** PubTator (TSV), BioC (XML/JSON), JSON

### BioC REST APIs

**PMC endpoint:**

```
GET /research/bionlp/RESTful/pmcoa.cgi/BioC_{format}/{id}/{encoding}
```

**PubMed endpoint:**

```
GET /research/bionlp/RESTful/pubmed.cgi/BioC_{format}/{pmid}/{encoding}
```

**Supplementary materials:**

```
GET /research/bionlp/RESTful/pmcoa.cgi/BioC_{format}/{PMCID}_supp/{encoding}
```

- `format`: xml | json
- `encoding`: unicode | ascii

## 6 Entity Types

gene, disease, chemical, variant (mutation), species, cell_line

## Domain Types

```
BioDocument:
  documents: ReadonlyArray<{
    id: string
    passages: ReadonlyArray<BioPassage>
  }>

BioPassage:
  type: string               // 'title' | 'abstract' | 'title_1' | 'paragraph' | ...
  text: string
  offset: number
  annotations: ReadonlyArray<Annotation>

Annotation:
  text: string
  type: EntityType
  id: string                 // normalized ID (NCBI Gene ID, MeSH ID, etc.)
  offset: number
  length: number

EntityMatch:
  id: string                 // @ENTITY_TYPE_Name format
  name: string
  type: EntityType

RelatedEntity:
  id: string
  name: string
  type: EntityType
  score: number
  pmids: ReadonlyArray<string>

SearchResult:
  total: number
  page: number
  pageSize: number
  articles: ReadonlyArray<{ pmid: string; title: string; snippets: ReadonlyArray<string> }>

PubTatorAnnotation:          // TSV format
  pmid: string
  start: number
  end: number
  text: string
  type: string
  id: string
```

## Public API

```
PubTator()

// PubTator3 Search API
.findEntity(query, entityType?) → Promise<ReadonlyArray<EntityMatch>>
.findRelations(entityId, targetType, relationType) → Promise<ReadonlyArray<RelatedEntity>>
.search(query, options?) → Promise<SearchResult>

// PubTator Export API
.export(pmids, options?) → Promise<ReadonlyArray<BioDocument>>

// PubTator Legacy API (⚠️ experimental)
.annotateByPmid(pmids, concept?, format?) → Promise<string>
.annotateText(text, concept?) → Promise<string>

// BioC REST APIs
.bioc.pmc(id, options?) → Promise<BioDocument>
.bioc.pubmed(pmid, options?) → Promise<BioDocument>
.bioc.supplementary(pmcid, options?) → Promise<BioDocument>

// Format parsers
.parseBioC(input: string) → BioDocument
.parsePubTatorTsv(input: string) → ReadonlyArray<PubTatorAnnotation>
```
