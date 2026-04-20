<h1 align="center">@ncbijs/jats</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/jats"><img src="https://img.shields.io/npm/v/@ncbijs/jats" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/jats"><img src="https://img.shields.io/npm/dm/@ncbijs/jats" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/jats" alt="license" /></a>
</p>

<p align="center">
  Parser for JATS XML full-text articles with markdown, plain-text, and RAG chunking output.
</p>

---

## Why

JATS (Journal Article Tag Suite) is the standard XML format for full-text articles in PMC. It's deeply nested with complex section structure, inline formulas, tables, figures, and references. Extracting usable text — especially for RAG pipelines that need properly chunked content with section metadata — requires understanding the full spec. This package parses once and outputs in the format you need.

- **Structured parse** — front matter, body sections, back matter (references, acknowledgements, appendices)
- **Markdown output** — headings, tables, figures, references formatted as markdown
- **Plain-text output** — clean text with indentation for section depth
- **RAG chunking** — split body into token-limited chunks with section paths and overlap control

## Install

```bash
npm install @ncbijs/jats
```

## Quick start

### Parse and convert to markdown

```typescript
import { parseJATS, toMarkdown } from '@ncbijs/jats';

const xml = await fetch(
  'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=PMC1234567',
).then((r) => r.text());

const article = parseJATS(xml);
const markdown = toMarkdown(article);
console.log(markdown);
```

### Extract plain text

```typescript
import { parseJATS, toPlainText } from '@ncbijs/jats';

const article = parseJATS(xml);
const text = toPlainText(article);
```

### RAG chunking

```typescript
import { parseJATS, toChunks } from '@ncbijs/jats';

const article = parseJATS(xml);
const chunks = toChunks(article, { maxTokens: 256 });

for (const chunk of chunks) {
  console.log(chunk.section, chunk.tokenCount);
  console.log(chunk.text);
}
```

## API

### `parseJATS(xml)`

Parse a JATS XML string into a structured article object with front matter, body sections, and back matter.

```typescript
const article = parseJATS(xmlString);
console.log(article.front.article.title);
console.log(article.body.length); // number of top-level sections
console.log(article.back.references.length);
```

| Parameter | Type     | Description      |
| --------- | -------- | ---------------- |
| `xml`     | `string` | JATS XML string. |

Returns `JATSArticle`.

Throws if the input is empty or contains no `<article>` element.

### `toMarkdown(article)`

Convert a parsed article to markdown. Produces headings for sections (depth-aware), markdown tables, figure captions, and a numbered reference list.

```typescript
const markdown = toMarkdown(article);
```

| Parameter | Type          | Description          |
| --------- | ------------- | -------------------- |
| `article` | `JATSArticle` | Parsed JATS article. |

Returns `string`.

### `toPlainText(article)`

Extract plain text from a parsed article. Sections are indented by depth. Tables show rows separated by pipes. Figures are shown as bracketed labels.

```typescript
const text = toPlainText(article);
```

| Parameter | Type          | Description          |
| --------- | ------------- | -------------------- |
| `article` | `JATSArticle` | Parsed JATS article. |

Returns `string`.

### `toChunks(article, options?)`

Split the article body into token-limited chunks suitable for RAG pipelines. Each chunk carries its section title and approximate token count. Adjacent chunks overlap to preserve context at boundaries.

```typescript
const chunks = toChunks(article);
const smallChunks = toChunks(article, { maxTokens: 256, overlap: 30 });
```

| Parameter | Type           | Required | Description             |
| --------- | -------------- | -------- | ----------------------- |
| `article` | `JATSArticle`  | Yes      | Parsed JATS article.    |
| `options` | `ChunkOptions` | No       | Chunking configuration. |

Returns `ReadonlyArray<Chunk>`.

#### `ChunkOptions`

| Option                | Type      | Default | Description                                              |
| --------------------- | --------- | ------- | -------------------------------------------------------- |
| `maxTokens`           | `number`  | `512`   | Approximate token limit per chunk (word-based estimate). |
| `overlap`             | `number`  | `50`    | Number of overlapping tokens between adjacent chunks.    |
| `includeSectionTitle` | `boolean` | `true`  | Prepend the section title to each chunk's text.          |

#### `Chunk`

| Field        | Type                      | Description                                       |
| ------------ | ------------------------- | ------------------------------------------------- |
| `text`       | `string`                  | Chunk text content.                               |
| `section`    | `string`                  | Section title this chunk belongs to.              |
| `tokenCount` | `number`                  | Approximate token count (whitespace-split words). |
| `metadata`   | `Record<string, unknown>` | Additional metadata (includes `depth`).           |

### `JATSArticle`

The top-level parsed structure:

| Field   | Type                     | Description                                    |
| ------- | ------------------------ | ---------------------------------------------- |
| `front` | `Front`                  | Journal metadata and article metadata.         |
| `body`  | `ReadonlyArray<Section>` | Body sections with paragraphs and subsections. |
| `back`  | `Back`                   | References, acknowledgements, appendices.      |

### `Front`

| Field     | Type          | Description       |
| --------- | ------------- | ----------------- |
| `journal` | `JournalMeta` | Journal metadata. |
| `article` | `ArticleMeta` | Article metadata. |

### `ArticleMeta`

| Field             | Type                     | Description       |
| ----------------- | ------------------------ | ----------------- |
| `title`           | `string`                 | Article title.    |
| `authors`         | `ReadonlyArray<Author>`  | Author list.      |
| `abstract`        | `string` (optional)      | Abstract text.    |
| `doi`             | `string` (optional)      | DOI.              |
| `pmid`            | `string` (optional)      | PubMed ID.        |
| `pmcid`           | `string` (optional)      | PMC ID.           |
| `publicationDate` | `PartialDate` (optional) | Year, month, day. |

### `Section`

| Field         | Type                     | Description              |
| ------------- | ------------------------ | ------------------------ |
| `title`       | `string`                 | Section heading.         |
| `depth`       | `number`                 | Nesting depth (1 = top). |
| `paragraphs`  | `ReadonlyArray<string>`  | Paragraph text content.  |
| `tables`      | `ReadonlyArray<Table>`   | Tables in this section.  |
| `figures`     | `ReadonlyArray<Figure>`  | Figures in this section. |
| `subsections` | `ReadonlyArray<Section>` | Nested subsections.      |

### `Reference`

| Field     | Type                    | Description                  |
| --------- | ----------------------- | ---------------------------- |
| `id`      | `string`                | Reference ID (e.g., `ref1`). |
| `label`   | `string` (optional)     | Display label (e.g., `1`).   |
| `authors` | `ReadonlyArray<string>` | Author names.                |
| `title`   | `string`                | Article title.               |
| `source`  | `string`                | Journal/source name.         |
| `year`    | `number` (optional)     | Publication year.            |
| `volume`  | `string` (optional)     | Volume number.               |
| `pages`   | `string` (optional)     | Page range.                  |
| `doi`     | `string` (optional)     | DOI.                         |
| `pmid`    | `string` (optional)     | PubMed ID.                   |

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  JATSArticle,
  Front,
  Back,
  Section,
  Chunk,
  ChunkOptions,
  Reference,
  Figure,
  Table,
  Author,
  ArticleMeta,
  JournalMeta,
  PartialDate,
} from '@ncbijs/jats';
```
