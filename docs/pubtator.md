# @ncbijs/pubtator — Text Mining & Entity Annotations Guide

## Overview

Client for PubTator3 APIs: entity search, annotated article export, custom text NER, and BioC format parsing. Zero dependencies.

PubTator3 has over 1 billion entity annotations across 36 million PubMed articles and 6 million PMC full-text articles. It identifies genes, diseases, chemicals, mutations, species, and cell lines.

## 2 API Layers

### Layer A: PubTator3 Search API

**Base URL:** `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/`
**Rate limit:** 3 requests/second

#### Entity Autocomplete

```
GET /entity/autocomplete/?query={text}&limit={n}
```

Returns entity matches with normalized IDs.

#### Search

```
GET /search/?text={query}&page={n}&page_size={n}
```

- Query accepts: keywords | `@ENTITY_ID`
- `page_size` max 200, max 1000 total results

### Layer B: PubTator Export API

**Base URL:** `https://www.ncbi.nlm.nih.gov/research/pubtator-api/`

```
GET /publications/export/biocjson?pmids={ids}&full={true|false}
GET /publications/export/biocxml?pmids={ids}&full={true|false}
```

- `full=true` — full-text annotations (PMC articles only)
- `full=false` — abstract annotations only (PubMed)

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
.findEntity(query, entityType?) -> Promise<ReadonlyArray<EntityMatch>>
.search(query, options?) -> Promise<SearchResult>

// PubTator Export API
.export(pmids, options?) -> Promise<ReadonlyArray<BioDocument>>

// Legacy annotation APIs
.annotateByPmid(pmids, concept?, format?) -> Promise<string>
.annotateText(text, concept?) -> Promise<string>

// Format parsers
.parseBioC(input: string) -> BioDocument
.parsePubTatorTsv(input: string) -> ReadonlyArray<PubTatorAnnotation>
```
