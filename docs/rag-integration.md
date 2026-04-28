# ncbijs as a Data Access Layer for RAG Pipelines

ncbijs is a **data access layer** for NCBI's biomedical databases. It is not a RAG system. It fetches, parses, types, chunks, and annotates biomedical data — providing the structured inputs that RAG pipelines need at every stage.

Think of it like this: just as a PDF extraction tool converts unstructured documents into text that can be embedded and searched, ncbijs converts NCBI's heterogeneous APIs (XML, TSV, JSON) into clean, typed JavaScript objects that can be embedded, searched, and used by LLMs.

The difference: NCBI data is already structured. ncbijs doesn't need OCR or layout detection — it normalizes 40+ different API formats into a single consistent typed interface.

## Where ncbijs fits in a RAG pipeline

A RAG pipeline has three stages. ncbijs plays a different role at each one:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│   │  1. INGEST  │ ──► │ 2. RETRIEVE │ ──► │ 3. GENERATE         │  │
│   │             │     │             │     │                     │  │
│   │ Fetch       │     │ Expand      │     │ LLM produces answer │  │
│   │ Chunk       │     │ Search      │     │ with citations      │  │
│   │ Enrich      │     │ Re-rank     │     │                     │  │
│   │ Embed       │     │             │     │                     │  │
│   └─────────────┘     └─────────────┘     └─────────────────────┘  │
│         ▲                   ▲                       ▲               │
│         │                   │                       │               │
│   ┌─────┴──────┐     ┌─────┴──────┐     ┌──────────┴────────────┐  │
│   │  ncbijs    │     │  ncbijs    │     │  ncbijs               │  │
│   │            │     │            │     │                       │  │
│   │ pmc        │     │ mesh       │     │ MCP server (http-mcp) │  │
│   │ jats       │     │ datasets   │     │ cite                  │  │
│   │ pubtator   │     │ pubchem    │     │ pmc                   │  │
│   │ mesh       │     │            │     │ id-converter          │  │
│   │ pubmed     │     │            │     │                       │  │
│   └────────────┘     └────────────┘     └───────────────────────┘  │
│                                                                     │
│   You provide:        You provide:       You provide:               │
│   Embeddings model    Vector database    LLM (Claude, GPT, etc.)   │
│   Vector database     Reranker           Prompt template            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### What ncbijs does

- Fetches articles, genes, variants, compounds, MeSH terms from NCBI
- Parses XML, TSV, JSON into typed JavaScript objects
- Chunks full-text articles into overlapping passages with section metadata
- Extracts named entities (genes, diseases, chemicals) via PubTator3
- Normalizes terminology to the MeSH controlled vocabulary
- Formats citations in academic styles (APA, Vancouver, etc.)
- Exposes all of the above as MCP tools for LLM agents

### What ncbijs does NOT do

- Vector embeddings (use OpenAI, Cohere, or open-source models)
- Semantic/similarity search (use a vector database)
- Re-ranking (use cross-encoders or Cohere Rerank)
- Prompt assembly (that's the RAG orchestrator's job)

## Stage 1: Ingestion — fetch, chunk, enrich

Before you can search, you need to ingest documents. ncbijs handles the biomedical data supply chain:

```
NCBI Servers                  ncbijs                         Your Vector DB
─────────────                 ──────                         ──────────────

PMC full-text     ──fetch──►  @ncbijs/pmc
  (JATS XML)                      │
                                  ▼
                              @ncbijs/jats
                              toChunks()
                                  │
                                  ▼
                          ┌───────────────┐
                          │ Text chunks   │
                          │ 512 tokens    │
                          │ + section     │
                          │ + metadata    │
                          └───────┬───────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              @ncbijs/       @ncbijs/      @ncbijs/
              pubtator       mesh          pubmed
              (entities)     (normalize)   (PMIDs)
                    │             │              │
                    ▼             ▼              ▼
              genes: [TPH1]  MeSH: D012701  supporting
              diseases: []   "Serotonin"    PMIDs: [...]
              chemicals:
                [serotonin]
                    │             │              │
                    └─────────────┼──────────────┘
                                  ▼
                          ┌───────────────┐
                          │ Enriched chunk│
                          │               │
                          │ text: "..."   │──embed──►  Vector DB
                          │ section: "..."│            (Pinecone,
                          │ entities: {}  │             pgvector,
                          │ mesh: [...]   │             Weaviate)
                          │ pmids: [...]  │
                          └───────────────┘
```

### Chunking

`@ncbijs/jats` splits parsed JATS articles into overlapping text passages:

```typescript
import { PMC } from '@ncbijs/pmc';
import { toChunks } from '@ncbijs/jats';

const pmc = new PMC();
const article = await pmc.fetchArticle('PMC7886120');
const chunks = toChunks(article, { maxTokens: 512, overlap: 50 });

// Each chunk:
// {
//   text: "In this study, we examined BRCA1...",
//   section: "Introduction",
//   tokenCount: 487,
//   metadata: { depth: 1 }
// }
```

### Entity extraction

`@ncbijs/pubtator` calls PubTator3 to find genes, diseases, chemicals, species, and variants in text:

```typescript
import { PubTator } from '@ncbijs/pubtator';

const pubtator = new PubTator();
const annotations = await pubtator.annotateByPmid(['33024307']);

// Returns BioC documents with character-level entity annotations:
// {
//   text: "BRCA1",
//   type: "Gene",
//   id: "672",        ← normalized NCBI Gene ID
//   offset: 40,
//   length: 5
// }
```

Store these as filterable metadata alongside your vectors. Two chunks mentioning the same gene from different articles get automatically linked — even without shared keywords.

### Vocabulary normalization

`@ncbijs/mesh` maps terms to the MeSH controlled vocabulary, so "serotonin", "5-HT", and "5-Hydroxytryptamine" all resolve to the same concept (D012701):

```typescript
import { MeSH } from '@ncbijs/mesh';

const mesh = new MeSH(treeData);
const descriptor = mesh.lookup('Serotonin');
// { id: 'D012701', name: 'Serotonin', treeNumbers: ['D02.033.800', ...] }
```

## Stage 2: Retrieval — query expansion

When a user searches, ncbijs helps find more relevant results:

```
User query: "chronic inflammation"
         │
         ▼
   @ncbijs/mesh
   expand("Inflammation")
         │
         ▼
   Expanded terms:
   "Inflammation", "Neuroinflammation",
   "Hepatitis", "Pancreatitis", ...
   + related: IL-6, TNF-alpha, NF-kB,
   C-reactive protein
         │
         ▼
   Vector search with expanded query
   finds passages about IL-6 that
   wouldn't match "chronic inflammation"
```

| Pipeline step    | ncbijs package     | What it does                                                           |
| ---------------- | ------------------ | ---------------------------------------------------------------------- |
| Query expansion  | `@ncbijs/mesh`     | Expand user terms via MeSH hierarchy to catch related concepts         |
| Cross-ref expand | `@ncbijs/datasets` | Fetch gene metadata (synonyms, GO terms) to expand connections         |
| Cross-ref expand | `@ncbijs/pubchem`  | Fetch compound properties and pharmacological data                     |
| Re-ranking boost | PubMed metadata    | Chunks with PubMed-validated claims (PMIDs from ingestion) rank higher |

## Stage 3: Generation — LLM tools and citations

During answer generation, the LLM can call ncbijs MCP tools to verify claims and add citations:

```
User question: "What is the role of TP53 in cancer?"
         │
         ▼
   LLM receives retrieved passages
         │
         ├──► MCP tool call: search-gene({ symbol: "TP53" })
         │    Returns: { geneId: 7157, description: "tumor protein p53", ... }
         │
         ├──► MCP tool call: search-pubmed({ term: "TP53 tumor suppressor" })
         │    Returns: [{ pmid: "...", title: "...", abstract: "..." }, ...]
         │
         ├──► MCP tool call: get-citation({ pmids: ["12345678"] })
         │    Returns: formatted citation in APA/Vancouver/etc.
         │
         ▼
   LLM generates answer with inline citations:
   "TP53 encodes the p53 tumor suppressor protein,
    which plays a critical role in... [PMID:12345678]"
```

### MCP server as LLM tool provider

The `@ncbijs/http-mcp` server exposes 27 tools that any MCP-compatible LLM agent can call. No wrapper code needed:

```json
{
  "mcpServers": {
    "ncbijs": {
      "command": "npx",
      "args": ["-y", "@ncbijs/http-mcp"],
      "env": { "NCBI_API_KEY": "" }
    }
  }
}
```

This turns the RAG system from a closed-book system (source materials only) into an open-book system that verifies and enriches answers with current biomedical literature in real time.

| ncbijs package         | Role during generation                                      |
| ---------------------- | ----------------------------------------------------------- |
| `@ncbijs/http-mcp`     | All ncbijs tools as MCP tools for the LLM                   |
| `@ncbijs/cite`         | Format references in academic styles (APA, Vancouver, etc.) |
| `@ncbijs/pmc`          | Pull full-text excerpts as supporting evidence              |
| `@ncbijs/id-converter` | Resolve between PMID, PMCID, and DOI                        |

## What about the data format?

A common question: "Don't I need to transform the data into something LLM-ready, like converting PDFs to markdown?"

The answer is: **ncbijs already does this transformation.** NCBI's raw data comes in XML, TSV, and JSON formats with inconsistent structures. ncbijs parses all of it into clean, typed JavaScript objects — which serialize to JSON.

| Aspect            | PDF to LLM                           | NCBI to LLM (ncbijs)                       |
| ----------------- | ------------------------------------ | ------------------------------------------ |
| Source format     | Unstructured (layout, fonts, images) | Already structured (XML, TSV, JSON APIs)   |
| Extraction needed | Yes (OCR, table detection)           | Already done by ncbijs parsers             |
| Output format     | Markdown, plain text                 | Typed JSON objects + Markdown + plain text |
| Chunking          | Generic text splitting               | Section-aware splitting (`toChunks`)       |
| Entity extraction | General NER                          | Domain-specific NER via PubTator3          |
| Vocabulary        | None                                 | MeSH controlled vocabulary (30K+ terms)    |

For **MCP tool use** (LLM calling tools directly), no additional transformation is needed. The MCP server returns JSON, and LLMs read JSON natively.

For **RAG ingestion**, ncbijs provides the chunks and metadata. You add embeddings with your preferred model (OpenAI, Cohere, Sentence-Transformers) and store vectors in your preferred database (Pinecone, pgvector, Weaviate).

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Your RAG System                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  ncbijs — Data Access Layer                                │   │
│  │                                                            │   │
│  │  Ingestion:     pmc, jats, pubtator, mesh, pubmed          │   │
│  │  Retrieval:     mesh (query expansion), datasets, pubchem  │   │
│  │  Generation:    http-mcp (27 tools), cite, id-converter    │   │
│  │  Local data:    store + store-mcp (13 tools)               │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Your infrastructure                                       │   │
│  │                                                            │   │
│  │  Embeddings:    OpenAI, Cohere, Sentence-Transformers      │   │
│  │  Vector DB:     Pinecone, pgvector, Weaviate, Qdrant       │   │
│  │  Reranker:      Cohere Rerank, cross-encoders              │   │
│  │  LLM:           Claude, GPT, Llama, Gemini                 │   │
│  │  Orchestrator:  LangChain, LlamaIndex, custom              │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Priority assessment

### High value, low friction

- **MCP server as LLM tool provider** — zero integration code, register and go
- **PubTator3 entity extraction** — entities become filterable metadata in your vector DB
- **MeSH vocabulary** — query expansion and cross-system terminology normalization
- **PubMed search** — literature-backed answers with PMID citations
- **Citation formatting** — academic-grade output

### Good fit, moderate effort

- **Datasets gene metadata** — enrich chunks with gene functions, pathways, ontology
- **PubChem compound data** — molecular properties for pharmacology/nutrition
- **PMC full text** — deep evidence for complex clinical queries

### Specialized (use when relevant)

- **ClinVar/SNP** — genetic variant significance, allele frequencies
- **BLAST** — sequence alignment for genomics workflows
- **Clinical Trials** — trial metadata for drug development pipelines
