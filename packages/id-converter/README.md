<h1 align="center">@ncbijs/id-converter</h1>

> **Runtime**: Browser + Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/id-converter"><img src="https://img.shields.io/npm/v/@ncbijs/id-converter" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/id-converter"><img src="https://img.shields.io/npm/dm/@ncbijs/id-converter" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/id-converter" alt="license" /></a>
</p>

<p align="center">
  Batch article ID conversion between PMID, PMCID, DOI, and Manuscript ID via the NCBI ID Converter API.
</p>

---

## Why

Researchers encounter articles through different identifiers — DOIs from citation managers, PMIDs from PubMed searches, PMCIDs from full-text repositories, Manuscript IDs from submission systems. Converting between them manually is tedious and error-prone, and the raw NCBI API returns a mix of JSON formats with inconsistent error handling.

`@ncbijs/id-converter` converts up to 200 IDs in a single request, normalizes the response into typed objects, and includes validation helpers to detect ID formats before making a network call.

- **Batch conversion** — up to 200 IDs per request
- **Zero dependencies** — pure TypeScript, works in browser and Node.js
- **Validation helpers** — `isPMID`, `isPMCID`, `isDOI`, `isMID` for format detection
- **Version history** — optionally retrieve all PMCID versions for an article
- **Typed responses** — every field is typed, no `any` or loose objects

## Install

```bash
npm install @ncbijs/id-converter
```

## Quick start

```typescript
import { convert, isPMID, isDOI } from '@ncbijs/id-converter';

// Convert a mix of IDs
const results = await convert(['35266103', '10.1038/s41586-022-04569-1', 'PMC9012345']);

for (const result of results) {
  console.log(`PMID: ${result.pmid}, DOI: ${result.doi}, PMCID: ${result.pmcid}`);
}

// Validate before converting
const id = 'PMC9012345';
if (isPMID(id)) console.log('This is a PMID');
if (isDOI(id)) console.log('This is a DOI');
```

## API

### `convert(ids, options?)`

Batch convert article identifiers. Accepts any mix of PMIDs, PMCIDs, DOIs, and Manuscript IDs.

```typescript
const results = await convert(['35266103', 'PMC9012345']);
```

| Parameter | Type                    | Required | Description              |
| --------- | ----------------------- | -------- | ------------------------ |
| `ids`     | `ReadonlyArray<string>` | Yes      | Array of IDs (max 200).  |
| `options` | `object`                | No       | See options table below. |

#### Options

| Option     | Type      | Default     | Description                                                    |
| ---------- | --------- | ----------- | -------------------------------------------------------------- |
| `idtype`   | `IdType`  | auto-detect | Hint the input type: `'pmid'`, `'pmcid'`, `'doi'`, or `'mid'`. |
| `versions` | `boolean` | `false`     | Include PMCID version history in the response.                 |
| `showaiid` | `boolean` | `false`     | Include Archiving Institution article ID.                      |
| `tool`     | `string`  | —           | Your application name (recommended by NCBI).                   |
| `email`    | `string`  | —           | Contact email (recommended by NCBI).                           |

Returns `Promise<ReadonlyArray<ConvertedId>>`.

```typescript
// With options
const results = await convert(['35266103'], {
  versions: true,
  tool: 'my-app',
  email: 'user@example.com',
});

for (const result of results) {
  console.log(`PMID: ${result.pmid}, PMCID: ${result.pmcid}, DOI: ${result.doi}`);
  if (result.versions) {
    for (const version of result.versions) {
      console.log(`  ${version.pmcid} (current: ${version.current})`);
    }
  }
}
```

### `isPMID(value)`

Check if a string matches the PMID format (positive integer).

```typescript
isPMID('35266103'); // true
isPMID('PMC9012345'); // false
```

Returns `boolean`.

### `isPMCID(value)`

Check if a string matches the PMCID format (`PMC` prefix followed by digits, optionally with a version suffix).

```typescript
isPMCID('PMC9012345'); // true
isPMCID('PMC9012345.1'); // true
isPMCID('35266103'); // false
```

Returns `boolean`.

### `isDOI(value)`

Check if a string matches the DOI format (`10.` prefix with registrant and suffix).

```typescript
isDOI('10.1038/s41586-022-04569-1'); // true
isDOI('35266103'); // false
```

Returns `boolean`.

### `isMID(value)`

Check if a string matches the Manuscript ID format (`NIHMS` prefix followed by digits).

```typescript
isMID('NIHMS123456'); // true
isMID('35266103'); // false
```

Returns `boolean`.

## Storage mode

Convert article IDs from locally stored data with the same return types — no network, no rate limits.

```ts
import { createConverter } from '@ncbijs/id-converter';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('./ncbijs.duckdb');
const convertIds = createConverter(storage);

const results = await convertIds(['35296856']);
console.log(results[0].pmcid); // 'PMC...'
```

The `createConverter()` factory accepts any object implementing the `DataStorage` interface (`getRecord` + `searchRecords`). `ReadableStorage` from `@ncbijs/store` satisfies this interface.

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  ConvertedId,
  ConvertParams,
  IdType,
  OutputFormat,
  VersionedId,
} from '@ncbijs/id-converter';
```

### `ConvertedId`

```typescript
interface ConvertedId {
  readonly pmid: string | null;
  readonly pmcid: string | null;
  readonly doi: string | null;
  readonly mid: string | null;
  readonly live: boolean;
  readonly releaseDate: string;
  readonly versions?: ReadonlyArray<VersionedId>;
  readonly aiid?: string;
}
```

### `VersionedId`

```typescript
interface VersionedId {
  readonly pmcid: string;
  readonly current: boolean;
}
```

### `IdType`

`'pmid' | 'pmcid' | 'doi' | 'mid'`

### `OutputFormat`

`'json' | 'xml' | 'csv' | 'html'`
