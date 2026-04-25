# @ncbijs/books

> **Runtime**: Browser + Node.js

Typed client for NCBI Books (Bookshelf). Search books and chapters and fetch detailed records with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/books
```

## Usage

```ts
import { Books } from '@ncbijs/books';

const books = new Books({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await books.search('molecular biology');
console.log(searchResult.total); // 256
console.log(searchResult.ids); // ['12345', '67890']

const records = await books.fetch(searchResult.ids);
console.log(records[0].title); // 'Molecular Biology of the Cell'
console.log(records[0].bookName); // 'Molecular Biology of the Cell. 4th edition'
console.log(records[0].resourceType); // 'Book'
console.log(records[0].publicationDate); // '2002'
console.log(records[0].bookAccessionId); // 'NBK21054'
```

## API

### `new Books(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<BooksSearchResult>`

Search Books by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: Array<string>): Promise<Array<BooksRecord>>`

Fetch book/chapter details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<Array<BooksRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Books, BooksHttpError } from '@ncbijs/books';

try {
  await books.search('molecular biology');
} catch (err) {
  if (err instanceof BooksHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `BooksSearchResult`

```ts
interface BooksSearchResult {
  total: number;
  ids: Array<string>;
}
```

### `BooksRecord`

```ts
interface BooksRecord {
  uid: string;
  title: string;
  publicationDate: string;
  entryId: string;
  accessionId: string;
  parents: string;
  resourceType: string;
  resourceId: string;
  text: string;
  bookId: number;
  bookAccessionId: string;
  chapterId: number;
  chapterAccessionId: string;
  bookName: string;
  navigation: string;
}
```
