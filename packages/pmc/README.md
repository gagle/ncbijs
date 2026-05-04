<h1 align="center">@ncbijs/pmc</h1>

> **Runtime**: Browser + Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/pmc"><img src="https://img.shields.io/npm/v/@ncbijs/pmc" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/pmc"><img src="https://img.shields.io/npm/dm/@ncbijs/pmc" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/pmc" alt="license" /></a>
</p>

<p align="center">
  PMC full-text article retrieval via E-utilities, OA Service, and OAI-PMH, with markdown and RAG chunking output.
</p>

---

## Why

PMC provides full-text articles through three different APIs with different capabilities and access patterns. E-utilities gives you JATS XML by PMCID. The OA Service tells you what's openly available and where to download it. OAI-PMH lets you harvest metadata in bulk. Each has its own URL scheme, pagination model, and response format.

`@ncbijs/pmc` unifies all three behind one client and adds conversion to markdown, plain text, and RAG-ready chunks.

- **E-utilities integration** — fetch and parse JATS XML into structured article objects
- **OA Service** — check open access availability and get download links (tgz, pdf)
- **OAI-PMH** — harvest metadata records with resumption token pagination
- **Output formats** — convert full-text articles to markdown, plain text, or chunked segments for RAG pipelines
- **Automatic PMCID normalization** — accepts both `"PMC1234567"` and `"1234567"`

## Install

```bash
npm install @ncbijs/pmc
```

## Quick start

```typescript
import { PMC, pmcToMarkdown, pmcToChunks } from '@ncbijs/pmc';

const pmc = new PMC({
  tool: 'my-app',
  email: 'user@example.com',
  apiKey: 'your-ncbi-api-key',
});

// Fetch a full-text article
const article = await pmc.fetch('PMC7096803');
console.log(article.front.title);

// Convert to markdown
const markdown = pmcToMarkdown(article);

// Or chunk for RAG
const chunks = pmcToChunks(article, { maxTokens: 512 });
```

## API

### `new PMC(config)`

```typescript
const pmc = new PMC({
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

### `fetch(pmcid)`

Fetch a full-text article from PMC and parse the JATS XML into a structured object.

```typescript
const article = await pmc.fetch('PMC7096803');
console.log(article.front.title);
console.log(article.license);
```

Returns `Promise<FullTextArticle>`.

### `oa.lookup(pmcid)`

Check Open Access availability for a single article and get download links.

```typescript
const record = await pmc.oa.lookup('PMC7096803');

for (const link of record.links) {
  console.log(`${link.format}: ${link.href}`);
}
```

Returns `Promise<OARecord>`.

### `oa.since(date, options?)`

List Open Access articles added or updated since a date. Handles resumption token pagination automatically.

```typescript
for await (const record of pmc.oa.since('2024-01-01')) {
  console.log(`${record.pmcid}: ${record.citation}`);
}
```

| Option   | Type               | Default | Description                |
| -------- | ------------------ | ------- | -------------------------- |
| `until`  | `string`           | —       | End date for the range.    |
| `format` | `'tgz'` \| `'pdf'` | —       | Filter by download format. |

Returns `AsyncIterableIterator<OARecord>`.

### `oai.getRecord(pmcid, metadataPrefix?)`

Retrieve a single OAI-PMH metadata record.

```typescript
const record = await pmc.oai.getRecord('PMC7096803');
console.log(record.identifier);
console.log(record.datestamp);
```

| Parameter        | Type     | Default | Description                                  |
| ---------------- | -------- | ------- | -------------------------------------------- |
| `pmcid`          | `string` | —       | The PMC ID (with or without `"PMC"` prefix). |
| `metadataPrefix` | `string` | `'pmc'` | OAI-PMH metadata format.                     |

Returns `Promise<OAIRecord>`.

### `oai.listRecords(options)`

Harvest OAI-PMH metadata records in bulk. Handles resumption token pagination automatically.

```typescript
for await (const record of pmc.oai.listRecords({ from: '2024-01-01', set: 'pmc-open' })) {
  console.log(record.identifier);
}
```

| Option           | Type     | Default | Description                            |
| ---------------- | -------- | ------- | -------------------------------------- |
| `from`           | `string` | —       | Start date (YYYY-MM-DD).               |
| `until`          | `string` | —       | End date (YYYY-MM-DD).                 |
| `set`            | `string` | —       | OAI-PMH set name (e.g., `'pmc-open'`). |
| `metadataPrefix` | `string` | `'pmc'` | OAI-PMH metadata format.               |

Returns `AsyncIterableIterator<OAIRecord>`.

### `pmcToMarkdown(article)`

Convert a full-text article to a markdown string.

```typescript
import { pmcToMarkdown } from '@ncbijs/pmc';

const markdown = pmcToMarkdown(article);
```

Returns `string`.

### `pmcToPlainText(article)`

Convert a full-text article to plain text (no markup).

```typescript
import { pmcToPlainText } from '@ncbijs/pmc';

const text = pmcToPlainText(article);
```

Returns `string`.

### `pmcToChunks(article, options?)`

Split a full-text article into chunks for RAG pipelines or embedding.

```typescript
import { pmcToChunks } from '@ncbijs/pmc';

const chunks = pmcToChunks(article, { maxTokens: 512 });

for (const chunk of chunks) {
  console.log(`[${chunk.section}] ${chunk.text.slice(0, 80)}...`);
}
```

Returns `ReadonlyArray<Chunk>`.

## Bulk parsers

### `parsePmcS3Inventory(csv)`

Parses a PMC Open Access S3 inventory CSV file from `s3://pmc-oa-opendata/inventory-reports/` into structured records. PMC IDs, versions, and formats are extracted from the S3 key path.

```typescript
import { parsePmcS3Inventory } from '@ncbijs/pmc';
const records = parsePmcS3Inventory(fs.readFileSync('inventory.csv', 'utf-8'));
```

Returns `ReadonlyArray<PmcS3Record>`.

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  FullTextArticle,
  OARecord,
  OALink,
  OAIRecord,
  PMCConfig,
  Chunk,
  ChunkOptions,
  OAListOptions,
  OAIListOptions,
  PmcS3Record,
} from '@ncbijs/pmc';
```

### `FullTextArticle`

```typescript
interface FullTextArticle {
  readonly pmcid: string;
  readonly front: Front;
  readonly body: ReadonlyArray<Section>;
  readonly back: Back;
  readonly license: string;
}
```

### `OARecord`

```typescript
interface OARecord {
  readonly pmcid: string;
  readonly citation: string;
  readonly license: string;
  readonly retracted: boolean;
  readonly links: ReadonlyArray<OALink>;
}
```

### `OALink`

```typescript
interface OALink {
  readonly format: 'tgz' | 'pdf';
  readonly href: string;
  readonly updated: string;
}
```

### `OAIRecord`

```typescript
interface OAIRecord {
  readonly identifier: string;
  readonly datestamp: string;
  readonly setSpec: string;
  readonly metadata: string;
}
```

### `PmcS3Record`

```typescript
interface PmcS3Record {
  readonly bucket: string;
  readonly key: string;
  readonly sizeBytes: number;
  readonly lastModified: string;
  readonly eTag: string;
  readonly storageClass: string;
  readonly pmcid: string;
  readonly version: string;
  readonly format: string;
}
```
