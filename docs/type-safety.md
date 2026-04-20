# Type Safety Architecture

## Principle

**Every HTTP call is typed end-to-end: request params → request body → response type.**
No `any`, no untyped fetch calls, no loose objects. `ReadonlyArray<T>` and `Readonly<T>` for all public return types.

## OpenAPI Availability

Most NCBI APIs lack OpenAPI specs. Only two community specs exist:

- `ncbi/GeneGPT` repo has `gpts_schema.json` (partial E-utilities)
- `ncbi-nlp/pubtator-gpt` repo has OpenAPI 3.1 for PubTator3

We hand-write all types. Community specs serve as cross-reference only.

## Three-Layer Type Pattern

Each package with HTTP calls has three type layers:

### Layer 1: Request Parameter Types (`types/params.ts`)

What the user passes in. Exact mirror of NCBI CGI parameters with TypeScript refinements.

```typescript
export interface ESearchParams {
  readonly db: string;
  readonly term: string;
  readonly usehistory?: 'y';
  readonly retstart?: number;
  readonly retmax?: number;
  readonly retmode?: 'xml' | 'json';
  readonly sort?: ESearchSort;
  readonly field?: string;
  readonly datetype?: 'mdat' | 'pdat' | 'edat';
  readonly reldate?: number;
  readonly mindate?: string; // YYYY/MM/DD
  readonly maxdate?: string; // YYYY/MM/DD
  readonly idtype?: 'acc';
  readonly WebEnv?: string;
  readonly query_key?: number;
}
```

### Layer 2: Endpoint Definitions (`types/endpoints.ts`)

Maps each operation to its params and response types. Used internally by the HTTP client.

```typescript
export interface EUtilsEndpoints {
  readonly esearch: { readonly params: ESearchParams; readonly response: ESearchResult };
  readonly efetch: { readonly params: EFetchParams; readonly response: string };
  readonly esummary: { readonly params: ESummaryParams; readonly response: ESummaryResult };
  readonly epost: { readonly params: EPostParams; readonly response: EPostResult };
  readonly elink: { readonly params: ELinkParams; readonly response: ELinkResult };
  readonly einfo: { readonly params: EInfoParams; readonly response: EInfoResult };
  readonly espell: { readonly params: ESpellParams; readonly response: ESpellResult };
  readonly egquery: { readonly params: EGQueryParams; readonly response: EGQueryResult };
  readonly ecitmatch: { readonly params: ECitMatchParams; readonly response: ECitMatchResult };
}
```

### Layer 3: Parsed Response Types (`types/responses.ts`)

What the user gets back. Parsed, structured TypeScript objects (not raw XML/JSON).

```typescript
export interface ESearchResult {
  readonly count: number;
  readonly retMax: number;
  readonly retStart: number;
  readonly idList: ReadonlyArray<string>;
  readonly translationSet: ReadonlyArray<Readonly<Translation>>;
  readonly queryTranslation: string;
  readonly webEnv?: string;
  readonly queryKey?: number;
}
```

## Const Objects for Enumerations

Use `as const` satisfies pattern (tree-shakeable, no runtime enum overhead):

```typescript
export const ENTITY_TYPES = {
  Gene: 'gene',
  Disease: 'disease',
  Chemical: 'chemical',
  Variant: 'variant',
  Species: 'species',
  CellLine: 'cell_line',
} as const satisfies Record<string, string>;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];
```

## XML vs JSON Response Handling

| Endpoint type              | Raw response | Parsed to                                               |
| -------------------------- | ------------ | ------------------------------------------------------- |
| E-utilities (most)         | XML string   | Parsed by `pubmed-xml` or `jats` → typed domain objects |
| ESummary (retmode=json)    | JSON         | Directly typed interfaces                               |
| PubTator3 Search/Relations | JSON         | Directly typed interfaces                               |
| PubTator Export (biocjson) | JSON         | `BioDocument` typed interface                           |
| PubTator Export (biocxml)  | XML string   | Parsed by internal BioC parser → `BioDocument`          |
| ID Converter               | JSON/XML/CSV | Parsed to `ConvertedId[]`                               |
| Citation Exporter (csl)    | JSON         | `CSLData` typed interface                               |
| Citation Exporter (others) | Plain text   | `string`                                                |
| MeSH REST Lookup           | JSON         | Typed interfaces                                        |
| MeSH SPARQL                | JSON         | `SparqlResult` typed interface                          |

## Format-Dependent Return Types (Overloads)

For endpoints where the return type depends on a format parameter:

```typescript
// cite() uses overloads for type-safe format-dependent returns
export function cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
export function cite(
  id: string,
  format: Exclude<CitationFormat, 'csl'>,
  source?: CitationSource,
): Promise<string>;
```

## HTTP Client Typing

Each package's internal `http/client.ts` wraps `fetch` with typed signatures:

```typescript
async function typedFetch<E extends keyof EUtilsEndpoints>(
  endpoint: E,
  params: EUtilsEndpoints[E]['params'],
): Promise<EUtilsEndpoints[E]['response']> {
  // Build URL from params, call fetch, parse response
}
```

## Domain Types vs Wire Types

Two distinct type layers:

- **Wire types**: Match NCBI's raw response (XML element names, JSON field names)
- **Domain types**: Clean TypeScript interfaces for public API (camelCase, parsed dates, etc.)

Example: PubMed XML has `<ArticleId IdType="doi">` → Domain type has `articleIds.doi?: string`
