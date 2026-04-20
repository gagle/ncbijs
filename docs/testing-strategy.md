# Testing Strategy

## Unit Tests

### Framework

- Vitest 4.x with `globals: true`
- Coverage: v8 provider, per-package configs
- Mocking: `vi.stubGlobal('fetch', ...)` — no external mock libraries
- Target: 100% coverage (statements, branches, functions, lines)

### Test File Co-location

Tests live alongside source:

```
packages/eutils/src/
├── rate-limiter.ts
├── rate-limiter.spec.ts
├── eutils.ts
├── eutils.spec.ts
├── types/
│   ├── params.ts
│   └── params.spec.ts         (validation logic tests)
└── http/
    ├── client.ts
    └── client.spec.ts
```

### fetch Mocking Pattern

```typescript
function mockFetch(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(body, { status, headers: { 'Content-Type': 'application/xml' } }),
      ),
  );
}

// Usage
describe('esearch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('should parse ESearch XML response', () => {
    mockFetch('<eSearchResult><Count>42</Count>...</eSearchResult>');
    // ...
  });
});
```

### XML Fixture Strategy

For parser packages (`pubmed-xml`, `jats`), use inline XML strings in test files:

- Small fixtures: inline template literals
- Large fixtures: separate `.xml` files in `__fixtures__/` directory
- Real-world samples: anonymized/shortened real PubMed/PMC responses

```
packages/pubmed-xml/src/
├── __fixtures__/
│   ├── structured-abstract.xml
│   ├── flat-abstract.xml
│   ├── collective-author.xml
│   ├── medline-date.xml
│   ├── book-document.xml
│   └── multi-mesh.xml
├── parse-pubmed-xml.ts
└── parse-pubmed-xml.spec.ts
```

### Test Categories per Package

#### @ncbijs/eutils

- Config validation (missing tool/email)
- Rate limiter (token bucket, burst, API key modes)
- Each of 9 E-utility methods (params → URL construction → response parsing)
- History Server flow (WebEnv/queryKey propagation)
- Auto-pagination (efetchBatches)
- HTTP POST for large requests
- URL encoding
- Retry logic (429, 5xx, backoff)
- Error handling (malformed XML, network errors)

#### @ncbijs/pubmed-xml

- Structured vs flat abstracts
- All date formats (full, partial, MedlineDate, Season)
- Individual vs collective authors
- MeSH headings with qualifiers (MajorTopicYN)
- All ArticleId variants
- CommentsCorrectionsList (all RefTypes)
- DataBankList + AccessionNumbers
- Keywords (NLM vs NOTNLM owner)
- BookDocument elements
- Streaming parser (chunked input, constant memory)
- MEDLINE text format (all 2-letter tags)
- Edge: empty elements, missing fields, malformed XML

#### @ncbijs/pubmed

- Query builder (all filter methods → correct Entrez syntax)
- fetchAll flow (ESearch + efetchBatches + parse)
- batches() iterator
- Related articles (ELink neighbor_score)
- citedBy / references (ELink linkname)
- 10K cap workaround (date segmentation)
- Empty results
- Error propagation from eutils

#### @ncbijs/jats

- Section nesting (1 level, 3 levels, arbitrary depth)
- Table extraction (simple, complex markup)
- Figure extraction
- MathML handling (text fallback)
- Inline xref cleanup
- toMarkdown() output
- toPlainText() output
- toChunks() — token counting, splitting, overlap
- All JATS versions (1.0-1.4)
- Supplementary materials
- Back matter (references, acknowledgements, appendices)

#### @ncbijs/pmc

- E-utilities fetch → JATS parse
- OA Service lookup (single record)
- OA Service since (pagination with resumptionToken)
- OAI-PMH ListRecords (pagination)
- OAI-PMH GetRecord
- FTP vs S3 URL handling
- FullTextArticle conversion methods

#### @ncbijs/id-converter

- Batch conversion (1 ID, 200 IDs, >200 error)
- All 4 output formats
- Auto-detect ID type
- Validation: isPMID, isPMCID, isDOI, isMID (valid/invalid patterns)
- Versioned PMCIDs
- AIID field
- live/release-date handling
- Error: unknown ID, mixed valid/invalid

#### @ncbijs/pubtator

- PubTator3: entity autocomplete, relations, search
- Export: biocjson, biocxml, full vs abstract
- Legacy: pre-tagged, custom text (session polling)
- BioC REST: PMC, PubMed, supplementary materials
- parseBioC (XML and JSON variants)
- parsePubTatorTsv (all entity types)
- All 13 relation types
- All 6 entity types

#### @ncbijs/mesh

- lookup (by ID, by name, not found)
- expand (single tree, multiple trees)
- ancestors (leaf → root)
- children (direct only)
- treePath
- toQuery (generates PubMed-compatible query)
- SPARQL queries (mock fetch)
- REST Lookup (mock fetch)
- Supplementary concepts
- Qualifiers

#### @ncbijs/cite

- All 9 format codes
- CSL format returns CSLData (parsed JSON)
- Non-CSL formats return string
- All 3 sources (pubmed, pmc, books)
- citeMany iterator (rate limiting)
- Error: invalid ID, invalid format

## E2E Tests

### Scope

Integration tests against real NCBI APIs. Run in CI with `NCBI_API_KEY` secret.

### Packages that need E2E:

- eutils — basic ESearch + EFetch round-trip
- pubmed — search → fetch articles
- pmc — fetch full-text article
- id-converter — convert known IDs
- cite — generate citation for known PMID
- pubtator — entity search for known gene

### Configuration

- `fileParallelism: false` — serial execution to respect rate limits
- `testTimeout: 120_000` — NCBI can be slow
- `globalSetup` — validates NCBI_API_KEY is set

### NOT E2E tested:

- pubmed-xml, jats (pure parsers — unit tests sufficient)
- mesh (ships static data — unit tests sufficient, SPARQL is optional)
