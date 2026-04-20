<h1 align="center">@ncbijs/pubmed</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/pubmed"><img src="https://img.shields.io/npm/v/@ncbijs/pubmed" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/pubmed"><img src="https://img.shields.io/npm/dm/@ncbijs/pubmed" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/pubmed" alt="license" /></a>
</p>

<p align="center">
  High-level PubMed article search and retrieval client with fluent query builder.
</p>

---

## Why

The raw PubMed API (E-utilities) requires managing History Server WebEnv tokens, manual pagination, XML parsing, and date segmentation for large result sets. That's a lot of boilerplate between you and the articles you need.

`@ncbijs/pubmed` wraps all of that into a fluent interface: `search("CRISPR").author("Doudna").fetchAll()`.

- **Fluent query builder** with filters for author, journal, MeSH, date range, publication type, and proximity search
- **Automatic date segmentation** for queries exceeding the 10,000-result API limit
- **Streaming batches** via `AsyncIterableIterator` for memory-efficient processing
- **Citation graph traversal** — find related articles, citing articles, and references
- **Parsed article objects** with structured abstracts, MeSH headings, grants, and all identifiers

## Install

```bash
npm install @ncbijs/pubmed
```

## Quick start

```typescript
import { PubMed } from '@ncbijs/pubmed';

const pubmed = new PubMed({
  tool: 'my-app',
  email: 'user@example.com',
  apiKey: 'your-ncbi-api-key',
});

const articles = await pubmed
  .search('CRISPR')
  .author('Doudna')
  .dateRange('2020/01/01', '2024/12/31')
  .freeFullText()
  .fetchAll();

for (const article of articles) {
  console.log(`${article.pmid}: ${article.title}`);
}
```

## API

### `new PubMed(config)`

```typescript
const pubmed = new PubMed({
  tool: 'my-app',
  email: 'user@example.com',
  apiKey: 'your-ncbi-api-key',
  maxRetries: 3,
});
```

| Parameter    | Type     | Required | Description                                                 |
| ------------ | -------- | -------- | ----------------------------------------------------------- |
| `tool`       | `string` | Yes      | Your application name (NCBI requires this).                 |
| `email`      | `string` | Yes      | Contact email (NCBI requires this).                         |
| `apiKey`     | `string` | No       | NCBI API key. Increases rate limit from 3 to 10 req/second. |
| `maxRetries` | `number` | No       | Maximum retry attempts on transient failures.               |

### `search(term)`

Start building a PubMed query. Returns a `PubMedQueryBuilder`.

```typescript
const query = pubmed.search('cancer immunotherapy');
```

### `PubMedQueryBuilder`

Chain filters to narrow your search, then execute with `fetchAll()` or `batches()`.

#### `.author(name)`

Filter by author name.

```typescript
pubmed.search('CRISPR').author('Doudna JA');
```

#### `.journal(isoAbbrev)`

Filter by journal ISO abbreviation.

```typescript
pubmed.search('machine learning').journal('Nature');
```

#### `.meshTerm(descriptor)`

Filter by MeSH descriptor.

```typescript
pubmed.search('diabetes').meshTerm('Insulin Resistance');
```

#### `.dateRange(from, to)`

Filter by publication date. Format: `"YYYY/MM/DD"`.

```typescript
pubmed.search('COVID-19').dateRange('2020/01/01', '2023/12/31');
```

#### `.publicationType(type)`

Filter by publication type.

```typescript
pubmed.search('statins').publicationType('Meta-Analysis');
```

Available types: `'Review'`, `'Clinical Trial'`, `'Meta-Analysis'`, `'Randomized Controlled Trial'`, `'Systematic Review'`, `'Case Reports'`, `'Letter'`, `'Editorial'`, `'Comment'`, `'Practice Guideline'`.

#### `.freeFullText()`

Only include articles with free full text available.

```typescript
pubmed.search('Alzheimer').freeFullText();
```

#### `.sort(field)`

Set the sort order.

```typescript
pubmed.search('oncology').sort('pub_date');
```

| Value           | Description              |
| --------------- | ------------------------ |
| `'relevance'`   | Best match (default).    |
| `'pub_date'`    | Most recent first.       |
| `'Author'`      | Alphabetical by author.  |
| `'JournalName'` | Alphabetical by journal. |

#### `.proximity(terms, field, distance)`

Proximity search — find terms within a given word distance in a field.

```typescript
pubmed.search('cancer').proximity('tumor suppressor', 'tiab', 3);
```

#### `.limit(n)`

Cap the maximum number of results returned.

```typescript
pubmed.search('RNA').limit(100);
```

#### `.buildQuery()`

Return the constructed PubMed query string without executing it.

```typescript
const query = pubmed.search('CRISPR').author('Doudna').buildQuery();
// "CRISPR AND Doudna[au]"
```

Returns `string`.

#### `.fetchAll()`

Execute the query and return all matching articles. Automatically handles date segmentation when results exceed the 10,000-result API limit.

```typescript
const articles = await pubmed.search('CRISPR').fetchAll();
```

Returns `Promise<ReadonlyArray<Article>>`.

#### `.batches(size?)`

Stream results in batches for memory-efficient processing. Default batch size is 500.

```typescript
for await (const batch of pubmed.search('oncology').batches(200)) {
  console.log(`Processing ${batch.length} articles`);
}
```

Returns `AsyncIterableIterator<ReadonlyArray<Article>>`.

> **Note:** `batches()` does not support date segmentation. For queries exceeding 10,000 results, use `fetchAll()` or add filters to narrow results.

### `related(pmid)`

Find articles related to a given PMID, sorted by relevancy score.

```typescript
const related = await pubmed.related('35266103');

for (const article of related) {
  console.log(`${article.pmid} (score: ${article.relevancyScore})`);
}
```

Returns `Promise<ReadonlyArray<RelatedArticle>>`.

### `citedBy(pmid)`

Get articles that cite the given PMID.

```typescript
const citations = await pubmed.citedBy('35266103');
```

Returns `Promise<ReadonlyArray<Article>>`.

### `references(pmid)`

Get articles referenced by the given PMID.

```typescript
const refs = await pubmed.references('35266103');
```

Returns `Promise<ReadonlyArray<Article>>`.

## Types

All types are exported for use in your own interfaces:

```typescript
import type { Article, RelatedArticle, PublicationType, PubMedSort } from '@ncbijs/pubmed';
```

### `Article`

```typescript
interface Article {
  readonly pmid: string;
  readonly title: string;
  readonly abstract: {
    structured: boolean;
    text: string;
    sections?: ReadonlyArray<{ label: string; text: string }>;
  };
  readonly authors: ReadonlyArray<{
    lastName?: string;
    foreName?: string;
    collectiveName?: string;
    affiliation?: string;
  }>;
  readonly journal: {
    title: string;
    isoAbbrev: string;
    issn?: string;
    volume?: string;
    issue?: string;
  };
  readonly publicationDate: { year: number; month?: number; day?: number };
  readonly mesh: ReadonlyArray<{
    descriptor: string;
    qualifiers: ReadonlyArray<string>;
    majorTopic: boolean;
  }>;
  readonly articleIds: { pmid: string; doi?: string; pmc?: string; pii?: string };
  readonly publicationTypes: ReadonlyArray<string>;
  readonly grants: ReadonlyArray<{ grantId: string; agency: string; country: string }>;
  readonly keywords: ReadonlyArray<string>;
}
```

### `RelatedArticle`

Extends `Article` with a `relevancyScore: number` field.

### `PublicationType`

Union of standard PubMed publication types: `'Review' | 'Clinical Trial' | 'Meta-Analysis' | ...`.

### `PubMedSort`

`'relevance' | 'pub_date' | 'Author' | 'JournalName'`
