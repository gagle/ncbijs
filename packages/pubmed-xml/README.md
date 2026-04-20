<h1 align="center">@ncbijs/pubmed-xml</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/pubmed-xml"><img src="https://img.shields.io/npm/v/@ncbijs/pubmed-xml" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/pubmed-xml"><img src="https://img.shields.io/npm/dm/@ncbijs/pubmed-xml" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/pubmed-xml" alt="license" /></a>
</p>

<p align="center">
  Spec-compliant parser for PubMed/MEDLINE XML and MEDLINE plain-text formats.
</p>

---

## Why

PubMed XML has dozens of structural edge cases — structured abstracts with labeled sections, collective author names, MedlineDate fallback formats, multiple article IDs across different schemes. Writing a one-off parser means rediscovering these pitfalls. This package handles them all and returns clean typed objects.

- **PubmedArticleSet XML** — full parse of the standard PubMed efetch XML format
- **Streaming parser** — process large XML responses article-by-article via `AsyncIterableIterator`
- **MEDLINE plain-text** — parse the tagged MEDLINE format (`PMID- ...`, `TI  - ...`)
- **Complete field coverage** — abstract (structured/unstructured), authors, journal, MeSH, grants, keywords, data banks, comments/corrections, article IDs, publication types

## Install

```bash
npm install @ncbijs/pubmed-xml
```

## Quick start

### Parse XML

```typescript
import { parsePubmedXml } from '@ncbijs/pubmed-xml';

const xml = await fetch(
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678&rettype=xml',
).then((r) => r.text());

const articles = parsePubmedXml(xml);

for (const article of articles) {
  console.log(article.pmid, article.title);
  console.log(article.journal.title, article.publicationDate.year);
}
```

### Stream large responses

```typescript
import { createPubmedXmlStream } from '@ncbijs/pubmed-xml';

const response = await fetch(
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=1,2,3&rettype=xml',
);
const textStream = response.body!.pipeThrough(new TextDecoderStream());

for await (const article of createPubmedXmlStream(textStream)) {
  console.log(article.pmid, article.title);
}
```

### Parse MEDLINE text

```typescript
import { parseMedlineText } from '@ncbijs/pubmed-xml';

const medline = `
PMID- 12345678
TI  - A novel approach to cancer treatment
AU  - Smith J
AU  - Jones M
DP  - 2024 Mar 15
AB  - This study demonstrates...
MH  - Neoplasms/*therapy
`;

const articles = parseMedlineText(medline);
console.log(articles[0].title); // 'A novel approach to cancer treatment'
```

## API

### `parsePubmedXml(xml)`

Parse a PubmedArticleSet XML string into an array of typed article objects.

```typescript
const articles = parsePubmedXml(xmlString);
```

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `xml`     | `string` | PubmedArticleSet XML string. |

Returns `ReadonlyArray<PubmedArticle>`.

### `createPubmedXmlStream(input)`

Create a streaming parser that yields `PubmedArticle` objects as complete `<PubmedArticle>` elements arrive. Useful for large responses that should not be buffered entirely in memory.

```typescript
for await (const article of createPubmedXmlStream(textStream)) {
  // process each article as it arrives
}
```

| Parameter | Type                     | Description                  |
| --------- | ------------------------ | ---------------------------- |
| `input`   | `ReadableStream<string>` | Readable stream of XML text. |

Returns `AsyncIterableIterator<PubmedArticle>`.

Throws if the stream ends with an incomplete `<PubmedArticle>` element.

### `parseMedlineText(text)`

Parse MEDLINE plain-text format (tagged format with `PMID-`, `TI  -`, etc.) into typed article objects.

```typescript
const articles = parseMedlineText(medlineString);
```

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `text`    | `string` | MEDLINE tagged-format string. |

Returns `ReadonlyArray<PubmedArticle>`.

### `PubmedArticle`

Every parser returns `PubmedArticle` objects with the following fields:

| Field                 | Type                               | Description                                                        |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `pmid`                | `string`                           | PubMed ID.                                                         |
| `title`               | `string`                           | Article title (tags stripped).                                     |
| `vernacularTitle`     | `string` (optional)                | Title in original language.                                        |
| `abstract`            | `AbstractContent`                  | Abstract text, with structured sections if available.              |
| `authors`             | `ReadonlyArray<Author>`            | Author list.                                                       |
| `journal`             | `JournalInfo`                      | Journal title, abbreviation, ISSN, volume, issue.                  |
| `publicationDate`     | `PartialDate`                      | Year, month, day, or season/raw fallback.                          |
| `mesh`                | `ReadonlyArray<MeshHeading>`       | MeSH headings with descriptors, qualifiers, and major topic flags. |
| `articleIds`          | `ArticleIds`                       | PMID, DOI, PMC, PII, MID identifiers.                              |
| `publicationTypes`    | `ReadonlyArray<string>`            | Publication type list (e.g., `"Journal Article"`, `"Review"`).     |
| `grants`              | `ReadonlyArray<Grant>`             | Funding grants.                                                    |
| `keywords`            | `ReadonlyArray<Keyword>`           | Author and NLM keywords.                                           |
| `commentsCorrections` | `ReadonlyArray<CommentCorrection>` | Errata, retractions, comments.                                     |
| `dataBanks`           | `ReadonlyArray<DataBank>`          | Data bank accession numbers (e.g., GenBank).                       |
| `language`            | `string`                           | Language code (e.g., `"eng"`).                                     |
| `dateRevised`         | `PartialDate` (optional)           | Date last revised.                                                 |
| `dateCompleted`       | `PartialDate` (optional)           | Date citation completed.                                           |

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  PubmedArticle,
  Author,
  MeshHeading,
  MeshQualifier,
  AbstractSection,
  AbstractContent,
  CommentCorrection,
  DataBank,
  Grant,
  JournalInfo,
  Keyword,
  ArticleIds,
  PartialDate,
} from '@ncbijs/pubmed-xml';
```
