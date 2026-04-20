# @ncbijs/pmc — PMC Full-Text Client Spec Reference

## Overview

Full-text article retrieval from PubMed Central via E-utilities, OA Service, and OAI-PMH.

**Dependencies:** `@ncbijs/eutils`, `@ncbijs/jats`

## Public API

```
PMC(config)  — same config as EUtils

.fetch(pmcid: string) → Promise<FullTextArticle>
  — EFetch db=pmc rettype=xml → parsed by @ncbijs/jats

.oa — OA Web Service sub-client:
  .oa.lookup(pmcid) → Promise<OARecord>
  .oa.since(date, options?) → AsyncIterableIterator<OARecord>

.oai — OAI-PMH sub-client:
  .oai.listRecords(options) → AsyncIterableIterator<OAIRecord>
  .oai.getRecord(pmcid, metadataPrefix?) → Promise<OAIRecord>
```

## OA Web Service

**Base URL:** `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi`

### Lookup

```
GET /oa/oa.fcgi?id=PMC1234567
```

**Response:**

```
OARecord:
  pmcid: string
  citation: string
  license: 'CC BY' | 'CC BY-NC' | 'CC BY-NC-ND' | 'CC BY-SA' | ...
  retracted: boolean
  links: ReadonlyArray<{ format: 'tgz' | 'pdf'; href: string; updated: string }>
```

### Since (paginated listing)

```
GET /oa/oa.fcgi?from=2024-01-01&until=2024-06-30&format=tgz
```

**Parameters:**

- `from`, `until`: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS (EST/EDT)
- `format`: 'tgz' | 'pdf' (filter)
- `resumptionToken`: pagination (max 1000 records/page)

**FTP → AWS S3 Transition (CRITICAL):**

- Legacy FTP files moved to `deprecated/` subdirectory April 13, 2026
- All legacy files removed August 2026
- New location: PMC Cloud Service on AWS S3
- Package must handle both FTP and S3 URL patterns in `href` field

## OAI-PMH Service

**Base URL:** `https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/`
(Old URL `www.ncbi.nlm.nih.gov/pmc/oai/oai.cgi` now redirects)

**Spec:** OAI-PMH 2.0 compliant

### ListRecords

```
GET /api/oai/v1/mh/?verb=ListRecords&metadataPrefix=pmc&from=2024-01-01
```

**Parameters:**

- `verb`: ListRecords, GetRecord, ListIdentifiers, ListSets, Identify, ListMetadataFormats
- `metadataPrefix`: 'oai_dc' | 'pmc' | 'pmc_fm'
- `from`, `until`: date range
- `set`: filter by set
- `resumptionToken`: pagination

**Rate limit:** 3 requests/second
**Records per page:** ~10 (reduced from historical 100+)

### GetRecord

```
GET /api/oai/v1/mh/?verb=GetRecord&identifier=oai:pubmedcentral.nih.gov:1234567&metadataPrefix=pmc
```

## FullTextArticle Domain Type

```
FullTextArticle:
  pmcid: string
  front: { journal: JournalMeta; article: ArticleMeta }
  sections: ReadonlyArray<Section>
  references: ReadonlyArray<Reference>
  figures: ReadonlyArray<Figure>
  license: string

  .toMarkdown() → string       // delegates to JATSArticle
  .toPlainText() → string      // delegates to JATSArticle
  .toChunks(options) → ReadonlyArray<Chunk>
```

## OAIRecord Type

```
OAIRecord:
  identifier: string           // oai:pubmedcentral.nih.gov:PMCID
  datestamp: string
  setSpec: ReadonlyArray<string>
  metadata: string             // raw XML (oai_dc, pmc, or pmc_fm format)
```
