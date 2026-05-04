# @ncbijs/pubmed — PubMed Article Client Guide

## Overview

High-level PubMed search and retrieval. [PubMed](https://pubmed.ncbi.nlm.nih.gov/) indexes over 37 million citations from biomedical literature. This package provides a fluent query builder, auto-pagination past the 10K result cap, and typed Article objects.

**Dependencies:** `@ncbijs/eutils`, `@ncbijs/pubmed-xml`
**Spec:** PubMed via ESearch (db=pubmed) + EFetch (rettype=xml)

## Public API

```
PubMed(config)  — same config as EUtils (apiKey, tool, email, maxRetries)

.search(term) → PubMedQueryBuilder
  .author(name)
  .journal(isoAbbrev)
  .meshTerm(descriptor)
  .dateRange(from, to)
  .publicationType(type)
  .freeFullText()
  .sort(field)
  .proximity(terms, field, distance)
  .limit(n)
  .fetchAll() → Promise<ReadonlyArray<Article>>
  .batches(size) → AsyncIterableIterator<ReadonlyArray<Article>>

.related(pmid) → Promise<ReadonlyArray<RelatedArticle>>
.citedBy(pmid) → Promise<ReadonlyArray<Article>>
.references(pmid) → Promise<ReadonlyArray<Article>>
```

## Query Builder Internals

The builder constructs Entrez query syntax:

- `.author('Smith J')` → `Smith J[Author]`
- `.journal('Nature')` → `Nature[Journal]`
- `.meshTerm('Asthma')` → `"Asthma"[MeSH Terms]`
- `.dateRange('2020/01/01', '2024/12/31')` → `datetype=pdat&mindate=2020/01/01&maxdate=2024/12/31`
- `.publicationType('Review')` → `Review[Publication Type]`
- `.freeFullText()` → adds `free+fulltext[filter]`
- `.sort('pub_date')` → `sort=pub_date`
- `.proximity(['stress', 'cortisol'], 'Title', 3)` → `"stress cortisol"[Title:~3]`

## 10K Search Cap Workaround

PubMed caps ESearch at 10,000 results. For larger result sets:

1. Detect `count > 10000` from ESearch response
2. Auto-segment by date: bisect the date range
3. Run multiple searches with non-overlapping date ranges
4. Merge results, deduplicate by PMID
5. Transparent to user — `fetchAll()` handles this internally

## History Server Flow (fetchAll)

```
1. ESearch(term, usehistory=y) → { webEnv, queryKey, count }
2. Loop: EFetch(webEnv, queryKey, retstart=0, retmax=500)
   → EFetch(webEnv, queryKey, retstart=500, retmax=500)
   → ... until retstart >= count
3. Each batch: parsePubmedXml(rawXml) → Article[]
4. Concatenate all batches → return
```

## batches() Flow

Same as fetchAll but yields after each batch parse. Ideal for RAG ingestion:

```typescript
for await (const batch of pubmed.search('PNI').batches(500)) {
  await vectorStore.insert(batch.map(toEmbedding));
}
```

## Related Articles (ELink)

- `.related(pmid)` → ELink `cmd=neighbor_score`, returns PMIDs + relevancy scores
- `.citedBy(pmid)` → ELink `linkname=pubmed_pubmed_citedin`
- `.references(pmid)` → ELink `linkname=pubmed_pubmed_refs`

## Article Domain Type

```
Article:
  pmid: string
  title: string
  abstract: { structured: boolean; text: string; sections?: AbstractSection[] }
  authors: ReadonlyArray<Author>
  journal: { title: string; isoAbbrev: string; issn: string; volume?: string; issue?: string }
  publicationDate: { year: number; month?: number; day?: number }
  mesh: ReadonlyArray<MeshHeading>
  articleIds: { pmid: string; doi?: string; pmc?: string; pii?: string }
  publicationTypes: ReadonlyArray<string>
  grants: ReadonlyArray<Grant>
  keywords: ReadonlyArray<string>

RelatedArticle extends Article:
  relevancyScore: number
```

## Publication Types (common values)

'Journal Article', 'Review', 'Clinical Trial', 'Meta-Analysis', 'Randomized Controlled Trial',
'Systematic Review', 'Case Reports', 'Letter', 'Editorial', 'Comment', 'Practice Guideline'
