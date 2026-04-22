# RAG Integration with ncbijs

How ncbijs integrates with a biomedical RAG (Retrieval-Augmented Generation) system.

## Target system

A biomedical RAG system with a multi-step pipeline (embed, hybrid search, re-rank, cross-reference expand, prompt assemble, stream, persist) that ingests domain-specific source documents across multiple biological systems (digestive, immunology, microbiota, hormonal, neurology, nutrition, exercise, emotional), with cross-system references as a first-class concept.

## Integration points by pipeline stage

### 1. Ingestion enrichment (before embedding)

| ncbijs package     | What it adds                                                                                                                                                                                                            | Example                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@ncbijs/pubtator` | Named entity extraction (genes, diseases, chemicals, species) on each chunk as structured metadata in the vector database                                                                                               | A chunk about "intestinal microbiota and serotonin" yields `{genes: ["TPH1", "SLC6A4"], chemicals: ["serotonin"]}` as a filterable facet |
| `@ncbijs/mesh`     | Map extracted concepts to MeSH descriptors. The hierarchy enables cross-system discovery (serotonin to D012701 to "Biogenic Amines" to "Neurotransmitter Agents") and normalizes terminology to a controlled vocabulary | "Serotonin" and "5-HT" both resolve to the same MeSH descriptor                                                                          |
| `@ncbijs/pubmed`   | For each chunk's key claims, search PubMed for supporting literature. Store PMIDs as metadata for citation validation at generation time                                                                                | A chunk claiming "exercise reduces chronic IL-6" gets linked to PMIDs confirming or nuancing the claim                                   |

PubTator entities directly map to cross-system references. Two chunks mentioning the same gene from different modules (digestive and neurology both mentioning serotonin receptors) get automatically linked, even without shared keywords in the source text.

### 2. Query-time augmentation (search, re-rank, cross-reference expand)

| Pipeline step    | ncbijs package     | Integration                                                                                                                                               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query expansion  | `@ncbijs/mesh`     | User asks "chronic inflammation" and the MeSH hierarchy expands to IL-6, TNF-alpha, NF-kB, C-reactive protein, terms that appear across different modules |
| Cross-ref expand | `@ncbijs/datasets` | A retrieved chunk mentions BRCA1, fetch gene metadata (synonyms, GO terms, pathways) to expand connections to related chunks                              |
| Cross-ref expand | `@ncbijs/pubchem`  | A chunk about a nutrient/compound triggers fetching molecular data and pharmacological properties for the nutrition/exercise modules                      |
| Re-ranking boost | PubMed metadata    | Chunks with PubMed-validated claims (PMIDs stored at ingestion) rank higher than unsupported assertions                                                   |

### 3. Generation-time citation (prompt assembly, stream)

| ncbijs package         | Integration                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `@ncbijs/cite`         | Format PubMed references in any citation style (APA, Vancouver, etc.) for professional academic output |
| `@ncbijs/pmc`          | Pull full-text excerpts from open-access papers to include as evidence in the assembled prompt         |
| `@ncbijs/id-converter` | Resolve between PMID, PMCID, and DOI for consistent reference formatting                               |

This transforms the system from "here's what the source material says" to "here's what the source says, supported by [PMID:12345678]", which is critical for evidence-based answers.

### 4. MCP server as LLM tool provider

The `@ncbijs/http-mcp` server exposes all ncbijs tools for LLM agents. If the RAG system includes agent workflows, this is the lowest-friction integration.

The LLM agent calls MCP tools directly during generation to search PubMed for a specific claim, look up a gene's function, check variant clinical significance, or get entity annotations. This turns the RAG system from a closed-book system (source materials only) to an open-book system that verifies and enriches answers with current biomedical literature in real time.

No wrapper code needed. Register the MCP server as a tool provider for the LLM agent.

## Architecture

```
Backend
  |-- MCP Server (@ncbijs/http-mcp)            LLM agent tools (zero glue code)
  |-- EnrichmentService (ingestion)
  |     |-- @ncbijs/pubtator              entity extraction per chunk
  |     |-- @ncbijs/mesh                  vocabulary normalization
  |     +-- @ncbijs/pubmed                literature linking
  |-- RetrievalService (query-time)
  |     |-- @ncbijs/datasets              gene/taxonomy expansion
  |     +-- @ncbijs/pubchem               compound data expansion
  +-- CitationService (generation-time)
        |-- @ncbijs/cite                  formatted references
        |-- @ncbijs/pmc                   full-text evidence
        +-- @ncbijs/id-converter          PMID/DOI/PMCID resolution
```

## Priority assessment

### High value, low friction

- **MCP server as LLM agent tool provider** (zero integration code)
- **PubTator3 entity extraction** into chunk metadata (directly maps to cross-system references)
- **MeSH vocabulary** for query expansion and terminology normalization across biological systems
- **PubMed search** for literature-backed answers
- **Citation formatting** for academic-grade output

### Good fit, moderate effort

- **Datasets gene metadata** for cross-reference graph expansion
- **PubChem compound data** for nutrition/exercise module enrichment
- **PMC full text** for deep evidence on complex clinical reasoning queries

### Stretch (low priority)

- **ClinVar/SNP**: relevant only for genetics-heavy queries, a small subset of most biomedical curricula
- **BLAST**: sequence alignment is outside most clinical scopes
- **FASTA**: only relevant if the source material contains sequence data

## Key insight

A biomedical RAG system's central challenge is cross-system clinical reasoning: connecting digestive inflammation to neurological symptoms to hormonal cascades. ncbijs provides the biomedical vocabulary and literature graph to make those connections evidence-based and discoverable. PubTator finds the entities, MeSH maps them to a shared ontology, PubMed validates the relationships, and the MCP server lets the LLM explore these connections autonomously during generation.
