# @ncbijs — Complete Context Transfer Document

## Executive Summary

This document captures the full research, analysis, decisions, and technical specifications for a new npm organization (`@ncbijs`) containing 9 TypeScript packages that provide comprehensive, spec-compliant access to NCBI's biomedical literature APIs. The packages are designed to be zero-dependency (7 of 9), TypeScript-first, browser + Node.js compatible, and follow the author's established philosophy of RFC/spec-compliant, low-level utility design.

The primary motivation is building a RAG (Retrieval-Augmented Generation) pipeline for PNI (psychoneuroimmunology) research, but the packages are general-purpose tools for anyone working with NCBI's biomedical literature APIs in JavaScript/TypeScript.

---

## 1. Background & Motivation

### 1.1 The Author

Gabriel (GitHub: gagle) is a Node.js and TypeScript developer based in Girona, Spain. His npm package portfolio is characterized by RFC/spec-compliant, zero-dependency, low-level utility design. Existing packages include `bcp47` (BCP 47 language tag parser), `node-properties`, `node-streamifier`, and `node-tftp`.

### 1.2 The Problem

Gabriel has an existing RAG system focused on PNI (psychoneuroimmunology) and wants to integrate biomedical literature from PubMed/PMC as a knowledge source. OpenEvidence (the leading medical AI platform) was considered but its API is limited access and not publicly available. The alternative is building directly on NCBI's free, public APIs — which is what OpenEvidence itself does internally using RAG over PubMed/PMC.

### 1.3 Why npm Packages

During research, a critical gap was identified: the npm ecosystem has virtually zero functional packages for NCBI APIs. In Python, Biopython alone has ~4.7M monthly downloads, plus entrezpy, pymed, metapub, and easy-entrez serving various niches. In JavaScript/TypeScript:

- `ncbi-eutils`: 1 download/week, 9 years abandoned, no TypeScript, no API key support
- `pubmed-api`: 5 downloads/week, 4 years abandoned, JavaScript only, incomplete API coverage
- `bionode-ncbi`: 8 years abandoned

The Rust crate `pubmed-client` (Feb 2026) is ambitious but requires Rust toolchain to install, has massive dependency tree (tokio, reqwest, serde), and covers only ~60% of NCBI's literature API surface.

The opportunity: bring the Python ecosystem's maturity to JavaScript/TypeScript with Gabriel's signature zero-dep, spec-compliant approach.

---

## 2. Market Analysis

### 2.1 Python Ecosystem (Reference)

| Package                | Monthly Downloads  | Deps         | Coverage                                              |
| ---------------------- | ------------------ | ------------ | ----------------------------------------------------- |
| Biopython (Bio.Entrez) | ~4.7M (PyPI)       | NumPy        | 8 of 9 E-utilities, basic parsing, no auto-pagination |
| entrezpy               | ~65K total (conda) | stdlib only  | 5 of 9 E-utilities, Conduit pipelines, caching        |
| pymed                  | ~50K/month         | requests     | PubMed only, simple API, no History Server            |
| metapub                | ~15K/month         | eutils, lxml | Cross-NCBI (PubMed/ClinVar/CrossRef), PDF finder      |
| easy-entrez            | smaller            | requests     | Clean API, batching, dbSNP parsing                    |

Key insight from entrezpy paper (Bioinformatics 2019): "Biopython does not handle whole queries, leaving the user to implement the logic to fetch large requests." This is the gap entrezpy fills — and our `@ncbijs/eutils` will fill for JS.

### 2.2 Rust Ecosystem

`pubmed-client` (crates.io, Feb 2026) — Cargo workspace with 6 sub-packages:

- Core Rust library
- Node.js native bindings (napi-rs)
- WASM bindings
- Python bindings (PyO3)
- CLI
- MCP server

Covers: ESearch, EFetch, ESummary, ELink, EInfo, PMC JATS fetch, section parsing, Markdown export, MeSH extraction, citation formatters (APA/MLA/BibTeX/RIS), async (tokio), retry with backoff.

Missing: EPost, ESpell, EGQuery, ECitMatch, History Server, auto-pagination, BioC API, PMC OA Service, ID converter, MeSH tree traversal, MEDLINE bulk streaming, RAG chunking, PubTator.

### 2.3 npm Ecosystem

Effectively empty. The Rust crate's napi-rs bindings exist but require Rust toolchain compilation, making adoption impractical for most JS developers.

### 2.4 Timing

PyPI's March 2026 report showed the `arxiv` Python client jumping from 2.7M to 42.4M downloads in one month — driven by RAG/AI agent pipelines. The same wave will hit npm for biomedical literature tools.

---

## 3. Architecture Decisions

### 3.1 Organization Name: `@ncbijs`

Decision rationale:

- `@ncbi` rejected: Sounds official, could cause confusion of origin (NCBI is a US government agency)
- `@open-ncbi` rejected: "open-" prefix implies NCBI is closed, which is false
- `@entrez` rejected: Technically correct for E-utilities but doesn't cover PubTator, Citation Exporter
- `@medlit` / `@biolit` rejected: Too generic, dilutes NCBI focus
- `@ncbijs` chosen: Follows established npm pattern (`@popperjs`, `@hotwired`), communicates source (NCBI) + ecosystem (JS/TS), impossible to confuse with official NCBI package

### 3.2 Package Split Philosophy

Principle: Users think in tasks, not formats. Split by user intent, not by technical format.

- "I want PubMed articles" → `@ncbijs/pubmed`
- "I want full-text articles" → `@ncbijs/pmc`
- "I want annotated/mined text" → `@ncbijs/pubtator`
- "I want to parse XML I already have" → `@ncbijs/pubmed-xml` or `@ncbijs/jats`

Key merge decision: `@ncbi/bioc` was merged INTO `@ncbijs/pubtator`. Reasoning: BioC format only exists in NCBI ecosystem for two purposes — serving text to mining tools and carrying PubTator annotations. Nobody wants "BioC the format" in isolation. The format is an implementation detail; the task is text mining.

### 3.3 Runtime: Browser + Node.js

Both environments natively support `fetch` (browser always, Node 18+) and string parsing. All packages use:

- `fetch` for HTTP (native, no polyfill)
- `ReadableStream` (Web Streams API) for streaming (not `node:stream`)
- No `node:fs`, `node:buffer`, or any `node:` modules
- ESM-only output (`"type": "module"`)

Single build target. No bundler. No polyfills. No conditional imports.

### 3.4 WebAssembly: Rejected

WASM was evaluated and rejected because:

- HTTP is the bottleneck (NCBI rate-limits to 10 req/s), not CPU
- XML parsing of a typical 200KB JATS article takes ~2ms in JS vs ~0.3ms in WASM — irrelevant when network latency is 100ms+
- WASM adds .wasm binary distribution, async initialization, JS↔WASM string serialization overhead, bundler configuration requirements
- Breaks zero-dep philosophy
- The Rust crate's WASM approach demonstrates the complexity cost without meaningful user benefit

### 3.5 TypeScript Strategy

- Full type safety: every API parameter and response typed
- Generics where appropriate (e.g., EFetch return type varies by database/rettype)
- Strict mode (`"strict": true`)
- No enums (use `as const` objects for tree-shaking)
- Discriminated unions for response variants (e.g., ELink cmd types)

---

## 4. Package Specifications

### 4.1 `@ncbijs/eutils` — E-utilities Transport Layer

**Purpose:** Spec-compliant HTTP client for all 9 NCBI E-utilities with rate limiting, History Server, and auto-pagination.

**Problem it solves:** No JS/TS library covers all 9 E-utilities. Existing ones miss EPost, ESpell, EGQuery, ECitMatch, History Server, and proper rate limiting.

**Spec:** NCBI E-utilities API — https://eutils.ncbi.nlm.nih.gov/entrez/eutils/

- Reference: NBK25497 (General Introduction), NBK25499 (In-Depth Parameters), NBK25500 (Quick Start)

**Dependencies:** None (zero deps). Uses native `fetch`.

**API Surface:**

```
EUtils(config)
  config.apiKey?: string         — NCBI API key (10 req/s vs 3 req/s)
  config.tool: string            — App name (required by NCBI policy)
  config.email: string           — Developer email (required by NCBI policy)
  config.maxRetries?: number     — Retry count with exponential backoff (default: 3)

Methods (all async, return typed responses):
  .esearch(params)     → ESearchResult
  .efetch(params)      → string (raw XML/text/JSON)
  .esummary(params)    → ESummaryResult
  .epost(params)       → EPostResult { webEnv, queryKey }
  .elink(params)       → ELinkResult
  .einfo(params?)      → EInfoResult
  .espell(params)      → ESpellResult
  .egquery(params)     → EGQueryResult
  .ecitmatch(params)   → ECitMatchResult

  // High-level helpers
  .efetchBatches(params) → AsyncIterableIterator<string>
    — Auto-paginates via History Server (retstart/retmax iteration)
    — Yields raw response pages
```

**Key implementation details from spec:**

1. **Rate limiting:** 3 req/s without API key, 10 req/s with. Must enforce globally across all method calls. Use token bucket or sliding window.

2. **History Server:** ESearch with `usehistory=y` returns `webEnv` + `queryKey`. These can be passed to EFetch/ESummary/ELink instead of UID lists. Multiple query keys can share one WebEnv by passing existing WebEnv to subsequent calls. Query keys can be combined in ESearch `term` with `%23` prefix (e.g., `%231+AND+%232`).

3. **ESearch specifics:**
   - `retmax` default 20, max 10,000
   - PubMed/PMC cap at 10,000 total results (other DBs allow pagination beyond)
   - `sort` values for PubMed: `pub_date`, `Author`, `JournalName`, `relevance` (default)
   - Proximity search: `"term1 term2"[Title:~N]`
   - Date params: `datetype` (mdat/pdat/edat), `reldate`, `mindate`/`maxdate` (YYYY/MM/DD)
   - `field` param for field-limited search
   - `retmode=json` supported

4. **ESummary v2.0:** `version=2.0` returns db-specific richer DocSums with additional fields (`IsTruncatable`, `IsRangeable`).

5. **EFetch:** `rettype`/`retmode` matrix varies per database. For PubMed: xml, medline, uilist. No JSON support for EFetch.

6. **ELink `cmd` variants (9 total):**
   - `neighbor` — related UIDs (default)
   - `neighbor_score` — related UIDs + relevancy scores
   - `neighbor_history` — posts results to History Server
   - `acheck` — checks existence of all links for UIDs
   - `ncheck` — checks existence of neighbor links
   - `lcheck` — checks existence of LinkOut links
   - `llinks` — LinkOut URLs + attributes (all providers)
   - `llinkslib` — LinkOut URLs + attributes (libraries only)
   - `prlinks` — primary LinkOut provider URL

7. **EPost:** Up to 10,000 UIDs for PubMed/PMC. HTTP POST for >200 UIDs.

8. **ECitMatch:** Batch citation matching. Input format: `journal|year|volume|first_page|author_name|your_key|` separated by `\r`.

9. **URL encoding rules:** Spaces as `+`, `#` as `%23`, `"` as `%22`. All params lowercase except `&WebEnv`.

10. **idtype=acc:** For sequence databases (nuccore, popset, protein), returns accession.version identifiers instead of GI numbers.

11. **HTTP POST:** Required for large requests (>200 UIDs, long term strings). The `id` and `term` params go in POST body, not URL.

---

### 4.2 `@ncbijs/pubmed` — PubMed Article Client

**Purpose:** High-level PubMed search and retrieval with typed Article objects, fluent builder, and auto-pagination.

**Problem it solves:** RAG pipelines and literature tools need typed articles without dealing with raw XML, History Server mechanics, or pagination math.

**Spec:** PubMed via ESearch (db=pubmed) + EFetch (rettype=xml) — https://pubmed.ncbi.nlm.nih.gov/help/

**Dependencies:** `@ncbijs/eutils`, `@ncbijs/pubmed-xml`

**API Surface:**

```
PubMed(config)   — same config as EUtils

.search(term: string) → PubMedQueryBuilder
  .author(name)
  .journal(isoAbbrev)
  .meshTerm(descriptor)
  .dateRange(from, to)         — YYYY/MM/DD format
  .publicationType(type)       — 'Review' | 'Clinical Trial' | 'Meta-Analysis' | ...
  .freeFullText()              — adds free+fulltext[filter]
  .sort(field)                 — 'relevance' | 'pub_date' | 'Author' | 'JournalName'
  .proximity(terms, field, distance)  — [Title:~N] syntax
  .limit(n)
  .fetchAll() → Promise<Article[]>
  .batches(size) → AsyncIterableIterator<Article[]>

.related(pmid) → Promise<RelatedArticle[]>     — ELink cmd=neighbor_score
.citedBy(pmid) → Promise<Article[]>            — ELink pubmed_pubmed_citedin
.references(pmid) → Promise<Article[]>         — ELink pubmed_pubmed_refs

Article type:
  pmid: string
  title: string
  abstract: { structured: boolean, text: string, sections?: AbstractSection[] }
  authors: { lastName: string, foreName: string, collective?: string, affiliation?: string }[]
  journal: { title: string, isoAbbrev: string, issn: string, volume?: string, issue?: string }
  publicationDate: { year: number, month?: number, day?: number }
  mesh: { descriptor: string, qualifiers: string[], majorTopic: boolean }[]
  articleIds: { pmid: string, doi?: string, pmc?: string, pii?: string }
  publicationTypes: string[]
  grants: { grantId: string, agency: string, country: string }[]
  keywords: string[]
```

**PubMed-specific constraints:**

- Max 10,000 results per search (NCBI hard limit). For larger sets, auto-segment by date.
- `fetchAll()` internally uses History Server: ESearch with usehistory=y → efetchBatches.
- `batches(500)` yields typed Article[] per batch — ideal for RAG ingestion.

---

### 4.3 `@ncbijs/pmc` — PMC Full-Text Client

**Purpose:** Full-text article retrieval from PubMed Central via E-utilities (JATS) and OA Service, with structured section parsing and RAG-oriented chunking.

**Problem it solves:** RAG pipelines need full-text articles, not just abstracts. PMC has multiple retrieval methods and formats that nobody unifies in JS/TS.

**Specs:**

- PMC via E-utilities: db=pmc, rettype=xml (returns JATS XML)
- PMC OA Web Service: https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi (docs verified)
- PMC OAI-PMH Service: https://www.ncbi.nlm.nih.gov/pmc/tools/oai/

**Dependencies:** `@ncbijs/eutils`, `@ncbijs/jats`

**API Surface:**

```
PMC(config)   — same config as EUtils

.fetch(pmcid: string) → Promise<FullTextArticle>
  — E-utilities efetch db=pmc rettype=xml → parsed by @ncbijs/jats

.oa — OA Web Service sub-client:
  .oa.lookup(pmcid) → Promise<OARecord>
    — Returns: { pmcid, citation, license, retracted, links: { tgz?, pdf? } }
    — License values: 'CC BY', 'CC BY-NC', 'CC BY-NC-ND', etc.
    — Retraction status: 'yes' | 'no'
  .oa.since(date, options?) → AsyncIterableIterator<OARecord>
    — Paginated via resumptionToken (max 1000 per page)
    — options.until?: string, options.format?: 'tgz' | 'pdf'
    — Date format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    — NOTE: Links transitioning from FTP to AWS S3 (Aug 2026)

FullTextArticle type:
  pmcid: string
  front: { journal, article: { title, authors, abstract, doi } }
  sections: Section[]
  references: Reference[]
  figures: Figure[]
  license: string

  .toMarkdown() → string
  .toPlainText() → string
  .toChunks(options) → Chunk[]
    options.maxTokens: number (default 512)
    options.overlap: number (default 64)
    options.includeSectionTitle: boolean (default true)
```

**OA Web Service specifics (from verified docs):**

- Base URL: `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi`
- Parameters: `id`, `from`, `until`, `format`, `resumptionToken`
- Dates in EST/EDT (Bethesda, Maryland time)
- Response XML includes per-record: `id`, `citation`, `license`, `retracted`, links with `format`, `updated`, `href`
- Max 1000 records per response, uses resumptionToken for continuation
- FTP → AWS Cloud Service transition: Feb–Aug 2026

---

### 4.4 `@ncbijs/pubtator` — Text Mining & Entity Annotations

**Purpose:** Unified client for all PubTator/BioC APIs: entity search, relation discovery, annotated article export, and custom text NER. Includes BioC format parser.

**Problem it solves:** PubTator 3.0 provides 1B+ entity/relation annotations across 36M PubMed abstracts and 6M PMC full-text articles. No npm package exists for any of its 3 API layers. BioC format has no JS/TS parser.

**Specs (3 API layers, all verified):**

**Layer A — PubTator3 Search API** (`pubtator3-api`)

- OpenAPI 3.1 schema verified via https://github.com/ncbi-nlp/pubtator-gpt
- Base: `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/`

**Layer B — PubTator Export API** (`pubtator-api`)

- URL: `https://www.ncbi.nlm.nih.gov/research/pubtator-api/publications/export/bioc{xml|json}`
- Params: `pmids`, `full` (true for full-text annotations)

**Layer C — PubTator Legacy API** (`tmTool.cgi`)

- URL: `https://www.ncbi.nlm.nih.gov/CBBresearch/Lu/Demo/RESTful/tmTool.cgi/`
- Pre-tagged retrieval + custom text submission (session-based)

**Dependencies:** None (zero deps).

**API Surface:**

```
PubTator()

// PubTator3 Search API
.findEntity(query, entityType?) → Promise<EntityMatch[]>
  — GET /entity/autocomplete/?query={text}
  — 6 entity types: gene, disease, chemical, variant, species, cell_line

.findRelations(entityId, targetType, relationType) → Promise<RelatedEntity[]>
  — GET /relations?e1={id}&type={type}&e2={targetType}
  — entityId format: @ENTITY_TYPE_Name (e.g., @GENE_IL6)
  — 13 relation types: treat, cause, cotreat, convert, compare, interact,
    associate, positive_correlate, negative_correlate, prevent, inhibit,
    stimulate, drug_interact

.search(query, options?) → Promise<SearchResult>
  — GET /search/?text={query}&page={n}&page_size={n}
  — query accepts: keywords | @ENTITY_ID | "relations:type|@E1|@E2"
  — page_size max 200

// PubTator Export API
.export(pmids, options?) → Promise<BioDocument[]>
  — GET /pubtator-api/publications/export/bioc{json|xml}?pmids={ids}
  — options.format: 'json' | 'xml' (default: 'json')
  — options.full: boolean (true → full-text annotations, not just abstract)

// PubTator Legacy API
.annotateByPmid(pmids, concept?, format?) → Promise<string>
  — GET /tmTool.cgi/{concept}/{pmids}/{format}/
  — concept: 'Gene' | 'Disease' | 'Chemical' | 'Mutation' | 'Species' | 'BioConcept'
  — format: 'PubTator' | 'BioC' | 'JSON'

.annotateText(text, concept?) → Promise<string>
  — POST /tmTool.cgi/{concept}/Submit/ → sessionId
  — GET /tmTool.cgi/{sessionId}/Receive/ → result (poll)

// BioC REST APIs (PMC + PubMed full text via BioC format)
.bioc.pmc(id, options?) → Promise<BioDocument>
  — GET /research/bionlp/RESTful/pmcoa.cgi/BioC_{format}/{id}/{encoding}
.bioc.pubmed(pmid, options?) → Promise<BioDocument>
  — GET /research/bionlp/RESTful/pubmed.cgi/BioC_{format}/{pmid}/{encoding}

// Format parsers
.parseBioC(input: string) → BioDocument
.parsePubTatorTsv(input: string) → PubTatorAnnotation[]

BioDocument type:
  documents: [{
    id: string
    passages: [{
      type: string  // 'title' | 'abstract' | 'title_1' | 'paragraph' | ...
      text: string
      offset: number
      annotations: Annotation[]
    }]
  }]

Annotation type:
  text: string
  type: 'Gene' | 'Disease' | 'Chemical' | 'Mutation' | 'Species' | 'CellLine'
  id: string       // normalized ID (e.g., NCBI Gene ID)
  offset: number
  length: number

PubTatorAnnotation type (tab-delimited format):
  pmid: string
  start: number
  end: number
  text: string
  type: string
  id: string
```

---

### 4.5 `@ncbijs/cite` — Citation Formatting

**Purpose:** Citation generation in 9 formats via NCBI's Literature Citation Exporter API.

**Problem it solves:** Generating correctly formatted citations is error-prone. The Rust crate hand-rolls formatters. NCBI provides an authoritative server-rendered API that nobody wraps in JS.

**Spec:** Literature Citation Exporter — https://api.ncbi.nlm.nih.gov/lit/ctxp/ (docs at https://pmc.ncbi.nlm.nih.gov/api/ctxp/)

**Dependencies:** None (zero deps).

**API Surface:**

```
cite(id, format, source?) → Promise<string | CSLData>
  — source: 'pubmed' | 'pmc' | 'books' (default: 'pubmed')
  — format: 'ris' | 'nbib' | 'medline' | 'apa' | 'mla' |
            'chicago-author-date' | 'vancouver' | 'bibtex' | 'csl'
  — 'csl' returns parsed CSL-JSON object, all others return string
  — Endpoint: GET /v1/{source}/?format={fmt}&id={id}

citeMany(ids, format, source?) → AsyncIterableIterator<{ id, citation }>
  — Rate-limited: 3 req/s, no concurrent requests
  — NOTE: This rate limit is SEPARATE from E-utilities rate limit
```

**Verified formats from live API:**

- `ris` → RIS tagged format
- `nbib` → PubMed/MEDLINE tagged format (.nbib)
- `medline` → MEDLINE display format
- `apa` → APA 7th edition formatted string
- `mla` → MLA 9th edition formatted string
- `chicago-author-date` → Chicago Author-Date style
- `vancouver` → Vancouver/ICMJE style
- `bibtex` → BibTeX entry
- `csl` → CSL-JSON (Citation Style Language JSON)

---

### 4.6 `@ncbijs/pubmed-xml` — PubMed XML Parser

**Purpose:** Spec-compliant parser for PubMed/MEDLINE XML and MEDLINE text format.

**Problem it solves:** PubMed XML has notoriously inconsistent structure (structured vs flat abstracts, multiple date formats, collective authors, MeSH with qualifiers). No TypeScript parser handles all edge cases.

**Spec:** PubMed DTD — http://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_240101.dtd

**Dependencies:** None (zero deps).

**API Surface:**

```
parsePubmedXml(xml: string) → PubmedArticle[]
  — Parses EFetch rettype=xml output
  — Handles all DTD-specified structures

createPubmedXmlStream(input: ReadableStream) → AsyncIterableIterator<PubmedArticle>
  — SAX-style streaming parser for MEDLINE bulk files
  — Constant memory usage regardless of file size

parseMedlineText(text: string) → PubmedArticle[]
  — Parses EFetch rettype=medline output (2-letter tag format)
  — Tags: TI, AU, AB, MH, DP, TA, VI, IP, PG, AID, PT, GR, etc.
```

**DTD edge cases handled (verified against DTD):**

- `AbstractText` with `Label` + `NlmCategory` attributes (structured) vs plain text (flat)
- `MedlineDate` fallback when `PubDate` lacks Year/Month/Day
- `ArticleId` variants: pmid, doi, pmc, pii, mid
- `CollectiveName` vs individual `Author` (LastName/ForeName/Initials)
- `MeshHeading` → `DescriptorName` + `QualifierName[]` (each with `MajorTopicYN`)
- `Grant`: GrantID, Acronym, Agency, Country
- `PublicationType` list
- `CommentsCorrectionsList` for errata, retractions, updates
- `VernacularTitle` for non-English articles
- `DataBankList` + `AccessionNumberList`
- `KeywordList` with `Owner` attribute (author vs NLM)

---

### 4.7 `@ncbijs/jats` — JATS XML Full-Text Parser

**Purpose:** Parser for JATS (Journal Article Tag Suite) XML used by PMC full-text articles.

**Problem it solves:** JATS XML has arbitrarily nested sections, complex table markup, MathML, inline `<xref>` references. Only R (tidypmc) and Python (pubmed_parser) have parsers. No JS/TS parser exists.

**Spec:** JATS 1.0 / 1.1 / 1.2 / 1.3 — NISO Z39.96 — https://jats.nlm.nih.gov/

**Dependencies:** None (zero deps).

**API Surface:**

```
parseJATS(xml: string) → JATSArticle

JATSArticle:
  front: { journal: JournalMeta, article: ArticleMeta }
  body: Section[]
  back: { references: Reference[], acknowledgements?: string, appendices?: Section[] }

  .toMarkdown() → string
  .toPlainText() → string
  .toChunks(options) → Chunk[]

Section:
  title: string
  depth: number          // 1, 2, 3... from title_1, title_2, etc.
  paragraphs: string[]
  tables: { caption: string, headers: string[], rows: string[][] }[]
  figures: { id: string, label: string, caption: string }[]

Chunk:
  text: string
  section: string
  tokenCount: number
  metadata: Record<string, unknown>
```

**Key parsing challenges:**

- Section tags nested to arbitrary depths
- Tables may contain complex markup (MathML, nested tables)
- Inline `<xref>` references pasted at end of words (need cleanup)
- Formulas in MathML (extract as text fallback or LaTeX)
- Supplementary material links

---

### 4.8 `@ncbijs/id-converter` — Article ID Conversion

**Purpose:** Batch ID conversion between PMID, PMCID, DOI, and Manuscript ID.

**Spec:** PMC ID Converter API — https://pmc.ncbi.nlm.nih.gov/tools/id-converter-api/ (docs verified in full)

**Dependencies:** None (zero deps).

**API Surface:**

```
convert(ids, options?) → Promise<ConvertedId[]>
  — Base URL: https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/
  — Up to 200 IDs per request
  — options.idtype?: 'pmid' | 'pmcid' | 'doi' | 'mid'  (auto-detect default)
  — options.versions?: boolean  (show versioned PMCIDs)
  — options.showaiid?: boolean  (show Article Instance IDs)
  — options.format?: 'xml' | 'json' | 'csv'
  — options.tool?: string, options.email?: string

ConvertedId:
  pmid: string | null
  pmcid: string | null
  doi: string | null
  mid: string | null           // Author Manuscript ID (e.g., NIHMS1677310)
  versions?: VersionedId[]
  aiid?: string                // Article Instance ID

// Validation utilities
isPMID(value: string) → boolean
isPMCID(value: string) → boolean
isDOI(value: string) → boolean
isMID(value: string) → boolean
```

**Verified details:**

- PMCIDs must include "PMC" prefix unless `idtype=pmcid` is set
- Versioned PMCIDs (e.g., PMC2808187.2) only returned with `versions=yes`
- `showaiid=yes` returns Article Instance IDs (different from numeric PMCID for multi-version articles)
- Bulk alternative: download `PMC-ids.csv.gz` from FTP

---

### 4.9 `@ncbijs/mesh` — MeSH Vocabulary Utilities

**Purpose:** MeSH tree traversal, query expansion, and descriptor lookup for more comprehensive PubMed searches.

**Problem it solves:** Searching PubMed without MeSH expansion misses relevant articles. "Stress" alone won't find articles indexed under "Stress, Psychological"[MeSH] or its children.

**Spec:** MeSH — https://www.nlm.nih.gov/mesh/ + MeSH RDF — https://id.nlm.nih.gov/mesh/

**Dependencies:** None (zero deps). Ships with compact serialized MeSH tree (~2MB).

**API Surface:**

```
MeSH()

.lookup(descriptorIdOrName) → MeshDescriptor | null
.expand(term) → string[]              // narrower terms
.ancestors(term) → string[]           // broader terms
.children(term) → string[]            // direct children only
.treePath(term) → string[]            // full path to root
.toQuery(term) → string               // expanded PubMed query with [MeSH] tags

MeshDescriptor:
  id: string                // e.g., 'D011598'
  name: string              // e.g., 'Psychoneuroimmunology'
  treeNumbers: string[]     // e.g., ['F04.096.628']
  qualifiers: { name: string, abbreviation: string }[]
  pharmacologicalActions: string[]
  supplementaryConcepts: string[]     // chemicals, rare diseases

// Optional: live SPARQL queries (id.nlm.nih.gov/mesh/sparql)
.sparql(query: string) → Promise<SparqlResult>
```

---

## 5. Dependency Graph

```
@ncbijs/pubmed
  ├── @ncbijs/eutils       (transport)
  └── @ncbijs/pubmed-xml   (parser, zero deps)

@ncbijs/pmc
  ├── @ncbijs/eutils       (transport)
  └── @ncbijs/jats          (parser, zero deps)

@ncbijs/pubtator            (zero deps — self-contained)
@ncbijs/cite                (zero deps)
@ncbijs/eutils              (zero deps)
@ncbijs/pubmed-xml          (zero deps)
@ncbijs/jats                (zero deps)
@ncbijs/id-converter        (zero deps)
@ncbijs/mesh                (zero deps)
```

7 of 9 packages are zero-dep. 2 packages have internal-only deps.

---

## 6. API Coverage Matrix

| NCBI API                      | Endpoint                | Package           | Verified                |
| ----------------------------- | ----------------------- | ----------------- | ----------------------- |
| ESearch                       | esearch.fcgi            | eutils            | ✅ Full spec read       |
| EFetch                        | efetch.fcgi             | eutils            | ✅ Full spec read       |
| ESummary v1+v2                | esummary.fcgi           | eutils            | ✅ Full spec read       |
| EPost                         | epost.fcgi              | eutils            | ✅ Full spec read       |
| ELink (8 cmds)                | elink.fcgi              | eutils            | ✅ Full spec read       |
| EInfo                         | einfo.fcgi              | eutils            | ✅ Full spec read       |
| ESpell                        | espell.fcgi             | eutils            | ✅ Confirmed            |
| EGQuery                       | egquery.fcgi            | eutils            | ✅ Confirmed            |
| ECitMatch                     | ecitmatch.cgi           | eutils            | ✅ Confirmed            |
| History Server                | WebEnv + query_key      | eutils            | ✅ Full spec read       |
| PMC OA Service                | oa.fcgi                 | pmc               | ✅ Full docs read       |
| PMC OAI-PMH                   | oai/oai.cgi             | pmc               | ✅ Confirmed exists     |
| PMC ID Converter              | idconv/api/v1           | id-converter      | ✅ Full docs read       |
| BioC for PMC                  | pmcoa.cgi               | pubtator          | ✅ Confirmed            |
| BioC for PubMed               | pubmed.cgi              | pubtator          | ✅ Confirmed            |
| BioC Suppl. Materials         | (sub-endpoint)          | pubtator          | ✅ Confirmed            |
| PubTator3 entity autocomplete | pubtator3-api/entity/   | pubtator          | ✅ OpenAPI schema       |
| PubTator3 relations           | pubtator3-api/relations | pubtator          | ✅ OpenAPI schema       |
| PubTator3 search              | pubtator3-api/search/   | pubtator          | ✅ OpenAPI schema       |
| PubTator export               | pubtator-api/export     | pubtator          | ✅ Confirmed URL        |
| PubTator legacy               | tmTool.cgi              | pubtator          | ✅ Curl docs read       |
| Citation Exporter             | lit/ctxp/v1/\*          | cite              | ✅ Docs + live examples |
| MeSH via E-utilities          | db=mesh                 | mesh (via eutils) | ✅ Via eutils           |
| MeSH RDF/SPARQL               | id.nlm.nih.gov/mesh     | mesh              | ✅ URL confirmed        |
| PubMed XML DTD                | pubmed_240101.dtd       | pubmed-xml        | ✅ DTD link confirmed   |
| JATS                          | Z39.96                  | jats              | ✅ Spec confirmed       |

**Deliberately excluded (out of scope):**

- BLAST API, PubChem PUG, ClinVar Submission, NCBI Datasets, RxNorm, ClinicalTrials.gov, LitVar2
- All are outside biomedical literature scope

---

## 7. User Journey Matrix

| Scenario                             | Packages                               | Count |
| ------------------------------------ | -------------------------------------- | ----- |
| PubMed abstract search for RAG       | `pubmed`                               | 1     |
| PMC full-text ingestion for RAG      | `pmc`                                  | 1     |
| Entity-annotated text mining         | `pubtator`                             | 1     |
| Full PNI RAG pipeline                | `pubmed` + `pmc` + `pubtator` + `mesh` | 4     |
| Parse existing PubMed XML files      | `pubmed-xml`                           | 1     |
| Convert DOIs to PMIDs                | `id-converter`                         | 1     |
| Generate bibliography in APA/BibTeX  | `cite`                                 | 1     |
| Custom E-utilities pipeline (any DB) | `eutils`                               | 1     |
| "What chemicals inhibit IL-6?"       | `pubtator`                             | 1     |
| PMC full text via BioC (simpler)     | `pubtator`                             | 1     |
| Expand PubMed search with MeSH       | `mesh`                                 | 1     |

No scenario requires more than 4 packages. No ambiguity about which package to use.

---

## 8. Composition Rules

```
Abstracts only:          @ncbijs/pubmed
Full text (structured):  @ncbijs/pmc          (JATS sections)
Full text (simple):      @ncbijs/pubtator     (BioC passages)
Annotated text:          @ncbijs/pubtator
Citations:               @ncbijs/cite
ID resolution:           @ncbijs/id-converter
Query expansion:         @ncbijs/mesh
Raw API access:          @ncbijs/eutils
Parse XML offline:       @ncbijs/pubmed-xml or @ncbijs/jats
```

---

## 9. Technical Constraints

### 9.1 NCBI Rate Limits

- E-utilities: 3 req/s without API key, 10 req/s with API key
- Citation Exporter: 3 req/s, no concurrent requests (separate quota)
- PubTator: No documented rate limit (be conservative)
- PMC ID Converter: No documented rate limit (use tool/email)

### 9.2 PubMed Search Cap

- Max 10,000 results per ESearch for PubMed and PMC
- Other Entrez databases allow pagination beyond 10,000

### 9.3 PMC Infrastructure Transition

- Aug 2026: FTP links → AWS S3 URLs
- OA Web Service will return new URL format
- Package must handle both URL schemes

### 9.4 Build & Distribution

- TypeScript, ESM-only (`"type": "module"`)
- `exports` field in package.json (no `main`/`browser` fields)
- Target: ES2022 (native async/await, Web Streams, structured clone)
- Browser + Node 18+ (native fetch in both)
- No polyfills, no bundler config, no conditional imports

---

## 10. Roadmap (Priority Order)

### Phase 1 — Foundation (ship first)

1. `@ncbijs/eutils` — Everything else depends on this
2. `@ncbijs/pubmed-xml` — Parser needed by pubmed client
3. `@ncbijs/pubmed` — Highest user demand, simplest use case

### Phase 2 — Full Text

4. `@ncbijs/jats` — Parser needed by pmc client
5. `@ncbijs/pmc` — Full-text access for RAG
6. `@ncbijs/id-converter` — Needed to resolve DOI→PMCID for PMC fetch

### Phase 3 — Text Mining & Discovery

7. `@ncbijs/pubtator` — Entity annotations, relation search, BioC
8. `@ncbijs/mesh` — Query expansion for better search coverage

### Phase 4 — Citations

9. `@ncbijs/cite` — Citation formatting (lowest priority, thin wrapper)

### Phase 5 — Gabriel's PNI RAG

- Combine `pubmed` + `pmc` + `pubtator` + `mesh` into a pipeline
- Use `mesh.expand('Psychoneuroimmunology')` to build comprehensive queries
- Use `pubmed.search(expandedQuery).batches(500)` for abstract ingestion
- Use `pmc.fetch(pmcid).toChunks({ maxTokens: 512 })` for full-text chunking
- Use `pubtator.findRelations('@GENE_IL6', 'chemical', 'stimulate')` for entity-level discovery

---

## 11. Competitive Positioning vs Rust Crate

| Feature                | pubmed-client (Rust)             | @ncbijs (TS)                    |
| ---------------------- | -------------------------------- | ------------------------------- |
| Installation           | Rust toolchain + compile         | `npm install`                   |
| E-utilities coverage   | 4 of 9                           | 9 of 9                          |
| History Server         | ❌                               | ✅                              |
| Auto-pagination        | ❌                               | ✅                              |
| PubTator               | ❌                               | ✅ (3 API layers)               |
| BioC parser            | ❌                               | ✅                              |
| Citation API           | Hand-rolled formatters           | NCBI Citation Exporter API      |
| PMC OA Service         | ❌                               | ✅                              |
| ID Converter           | ❌                               | ✅ (with MID + versions)        |
| MeSH hierarchy         | Extract only                     | Full tree traversal + expansion |
| RAG chunking           | ❌                               | ✅ (token-aware)                |
| MEDLINE bulk streaming | ❌                               | ✅                              |
| Package size           | MB (native binary)               | KB (pure JS)                    |
| Dependencies           | tokio, reqwest, serde, quick-xml | zero                            |

Total features: Rust covers 14 features. @ncbijs covers 14 + 14 additional = 28 features.
