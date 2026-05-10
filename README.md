<h1 align="center">ncbijs</h1>

<p align="center">
  TypeScript clients for NCBI APIs — PubMed, PMC, BLAST, SNP, ClinVar, PubChem, Datasets, and more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Built_with-AI-7e47ff" alt="Built with AI" />
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/gagle/ncbijs" alt="license" /></a>
  <a href="./docs/rag-integration.md"><img src="https://img.shields.io/badge/RAG-Ready-blueviolet" alt="RAG Ready" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Server-blue" alt="MCP Server" /></a>
  <a href="./packages/http-mcp"><img src="https://img.shields.io/badge/LLM_Tools-27_tools-green" alt="LLM Tools" /></a>
  <a href="https://gagle.github.io/ncbijs/"><img src="https://img.shields.io/badge/Demo-Live-orange" alt="Live Demo" /></a>
</p>

---

> **Disclaimer**: This is an **unofficial**, community-maintained SDK. It is not affiliated with, endorsed by, or related to the [National Center for Biotechnology Information (NCBI)](https://www.ncbi.nlm.nih.gov/) or the [NCBI GitHub organization](https://github.com/ncbi). For official NCBI tools and resources, visit [ncbi.nlm.nih.gov/home/develop](https://www.ncbi.nlm.nih.gov/home/develop/).

## What is NCBI?

The [National Center for Biotechnology Information](https://www.ncbi.nlm.nih.gov/) (NCBI), part of the U.S. National Library of Medicine (NLM), maintains the world's largest collection of biomedical databases. These include **PubMed** (37M+ article citations), **PubMed Central** (PMC, 9M+ full-text articles), **MeSH** (controlled medical vocabulary), **BLAST** (sequence alignment), **dbSNP** (genetic variation), **ClinVar** (clinical variants), **PubChem** (chemical compounds), and many more. Researchers, clinicians, and developers rely on NCBI's public APIs to search, retrieve, and analyze biomedical data programmatically.

**ncbijs** provides typed, zero-dependency TypeScript clients for these APIs. **This entire project is built and maintained by AI** using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — no human-written code is accepted. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

It is designed for two audiences:

- **Developers and researchers** building biomedical applications, literature review tools, or clinical decision support systems.
- **LLM and AI agents** that need structured, programmatic access to biomedical literature for retrieval-augmented generation (RAG), entity extraction, and citation management.

**Built for LLM consumption.** Every package follows consistent naming, consistent interfaces, and has a self-documenting API with full JSDoc. The [MCP server](./packages/http-mcp) exposes 27 tools that any LLM agent can call directly. The workflow table below and the "Which package do I need?" decision tree make it easy for agents to discover the right package without reading source code. 40 of 43 packages run in the browser — ideal for agentic web apps that query NCBI without a backend.

### What can you do with ncbijs?

<!-- sync-docs:workflows:start -->
| Workflow                                              | Packages                            |
| ----------------------------------------------------- | ----------------------------------- |
| Search PubMed and retrieve article metadata           | `@ncbijs/pubmed` + `@ncbijs/eutils` |
| Fetch full-text articles from PMC                     | `@ncbijs/pmc` + `@ncbijs/jats`      |
| Extract genes, diseases, chemicals from articles      | `@ncbijs/pubtator`                  |
| Generate formatted citations (RIS, MEDLINE, CSL-JSON) | `@ncbijs/cite`                      |
| Convert between PMID, PMCID, and DOI                  | `@ncbijs/id-converter`              |
| Expand MeSH terms for comprehensive searches          | `@ncbijs/mesh`                      |
| Chunk full-text articles for RAG pipelines            | `@ncbijs/jats (toChunks)`           |
| Look up genes, genomes, and taxonomy                  | `@ncbijs/datasets`                  |
| Parse FASTA nucleotide/protein sequences              | `@ncbijs/fasta`                     |
| Run BLAST sequence alignments                         | `@ncbijs/blast`                     |
| Look up SNP/variant data from dbSNP                   | `@ncbijs/snp`                       |
| Query clinical variant significance from ClinVar      | `@ncbijs/clinvar`                   |
| Retrieve compound, substance, and assay data          | `@ncbijs/pubchem`                   |
| Fetch protein sequences in FASTA or GenBank format    | `@ncbijs/protein`                   |
| Fetch nucleotide sequences in FASTA or GenBank format | `@ncbijs/nucleotide`                |
| Parse GenBank flat file records locally               | `@ncbijs/genbank`                   |
| Look up genetic disorders from OMIM                   | `@ncbijs/omim`                      |
| Query medical genetics concepts from MedGen           | `@ncbijs/medgen`                    |
| Search genetic tests from GTR                         | `@ncbijs/gtr`                       |
| Search gene expression datasets from GEO              | `@ncbijs/geo`                       |
| Query structural variants from dbVar                  | `@ncbijs/dbvar`                     |
| Search sequencing experiment metadata from SRA        | `@ncbijs/sra`                       |
| Look up 3D molecular structures from MMDB/PDB         | `@ncbijs/structure`                 |
| Search conserved protein domains from CDD             | `@ncbijs/cdd`                       |
| Search NCBI Bookshelf entries                         | `@ncbijs/books`                     |
| Look up journal/serial records from NLM Catalog       | `@ncbijs/nlm-catalog`               |
| Convert variant notations (HGVS, SPDI, VCF)           | `@ncbijs/snp`                       |
| Get full compound annotations (GHS, patents)          | `@ncbijs/pubchem`                   |
| Chain search-fetch pipelines via History Server       | `@ncbijs/eutils`                    |
| Search clinical trials by condition/intervention      | `@ncbijs/clinical-trials`           |
| Get citation metrics and impact scores                | `@ncbijs/icite`                     |
| Normalize drug names and find drug classes            | `@ncbijs/rxnorm`                    |
| Look up drug labels, SPLs, and NDC packaging          | `@ncbijs/dailymed`                  |
| Find literature linked to genetic variants            | `@ncbijs/litvar`                    |
| Get annotated text with entity recognition            | `@ncbijs/bioc`                      |
| Autocomplete ICD-10, LOINC, SNOMED codes              | `@ncbijs/clinical-tables`           |
| Store NCBI data locally in DuckDB                     | `@ncbijs/store`                     |
| Query stored data with the same package API           | `fromStorage() on domain packages`  |
| Build data pipelines (Source → Parse → Sink)          | `@ncbijs/pipeline`                  |
| Load any NCBI dataset with one function call          | `@ncbijs/etl`                       |
| Watch NCBI sources for updates and re-sync            | `@ncbijs/sync`                      |
| Expose all tools to LLM agents via MCP                | `@ncbijs/http-mcp`                  |
| Query local NCBI data via MCP                         | `@ncbijs/store-mcp`                 |
<!-- sync-docs:workflows:end -->

## For AI agents and LLMs

The most effective way to consume ncbijs through an AI agent is to point the agent at this repository directly — clone it locally so the agent's working directory sits inside the repo, or give the agent read access on GitHub.

Every package ships two docs side by side:

- `README.md` — human-facing, what npm renders.
- `CLAUDE.md` — agent-optimised deep reference: full API surface, type metadata, cross-package wiring, common pitfalls, and "when NOT to use this".

Claude Code (and any agent that honours nested `CLAUDE.md` discovery) auto-loads `packages/{name}/CLAUDE.md` when the agent's working directory is inside that subtree. The root [`CLAUDE.md`](./CLAUDE.md) is the global router — workflow table, packages index, decision tree — so the agent lands on the right package without scanning the whole repo.

Clone, drop your agent in, and discovery just works.

## Packages

<!-- sync-docs:packages:start -->
| Package                                                 | Description                                                         | Version                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`@ncbijs/bioc`](./packages/bioc) | BioC API client — annotated PubMed and PMC articles (named entity… | [![npm](https://img.shields.io/npm/v/@ncbijs/bioc)](https://www.npmjs.com/package/@ncbijs/bioc) |
| [`@ncbijs/blast`](./packages/blast) | NCBI BLAST sequence alignment client. Async submit/poll/retrieve w… | [![npm](https://img.shields.io/npm/v/@ncbijs/blast)](https://www.npmjs.com/package/@ncbijs/blast) |
| [`@ncbijs/books`](./packages/books) | Typed client for NCBI Bookshelf — search and fetch biomedical book… | [![npm](https://img.shields.io/npm/v/@ncbijs/books)](https://www.npmjs.com/package/@ncbijs/books) |
| [`@ncbijs/cdd`](./packages/cdd) | Typed client for NCBI Conserved Domain Database (CDD) — search and… | [![npm](https://img.shields.io/npm/v/@ncbijs/cdd)](https://www.npmjs.com/package/@ncbijs/cdd) |
| [`@ncbijs/cite`](./packages/cite) | Citation formatting in 4 styles (RIS, MEDLINE, CSL-JSON, NLM Citat… | [![npm](https://img.shields.io/npm/v/@ncbijs/cite)](https://www.npmjs.com/package/@ncbijs/cite) |
| [`@ncbijs/clinical-tables`](./packages/clinical-tables) | Typed client for the NLM Clinical Tables Search API. Autocomplete… | [![npm](https://img.shields.io/npm/v/@ncbijs/clinical-tables)](https://www.npmjs.com/package/@ncbijs/clinical-tables) |
| [`@ncbijs/clinical-trials`](./packages/clinical-trials) | Typed client for the ClinicalTrials.gov v2 REST API. Search interv… | [![npm](https://img.shields.io/npm/v/@ncbijs/clinical-trials)](https://www.npmjs.com/package/@ncbijs/clinical-trials) |
| [`@ncbijs/clinvar`](./packages/clinvar) | NCBI ClinVar clinical variant data — search and fetch variants via… | [![npm](https://img.shields.io/npm/v/@ncbijs/clinvar)](https://www.npmjs.com/package/@ncbijs/clinvar) |
| [`@ncbijs/dailymed`](./packages/dailymed) | Typed client for the FDA DailyMed REST API v2 — drug name search,… | [![npm](https://img.shields.io/npm/v/@ncbijs/dailymed)](https://www.npmjs.com/package/@ncbijs/dailymed) |
| [`@ncbijs/datasets`](./packages/datasets) | Typed client for the NCBI Datasets API v2 — gene reports, taxonomy… | [![npm](https://img.shields.io/npm/v/@ncbijs/datasets)](https://www.npmjs.com/package/@ncbijs/datasets) |
| [`@ncbijs/dbvar`](./packages/dbvar) | Typed client for NCBI dbVar — search and fetch structural variatio… | [![npm](https://img.shields.io/npm/v/@ncbijs/dbvar)](https://www.npmjs.com/package/@ncbijs/dbvar) |
| [`@ncbijs/etl`](./packages/etl) | Pre-wired NCBI dataset loaders. One function call to download, par… | [![npm](https://img.shields.io/npm/v/@ncbijs/etl)](https://www.npmjs.com/package/@ncbijs/etl) |
| [`@ncbijs/eutils`](./packages/eutils) | Spec-compliant client for all 9 NCBI E-utilities (esearch, efetch,… | [![npm](https://img.shields.io/npm/v/@ncbijs/eutils)](https://www.npmjs.com/package/@ncbijs/eutils) |
| [`@ncbijs/fasta`](./packages/fasta) | Zero-dependency FASTA format parser. Pure synchronous function: st… | [![npm](https://img.shields.io/npm/v/@ncbijs/fasta)](https://www.npmjs.com/package/@ncbijs/fasta) |
| [`@ncbijs/genbank`](./packages/genbank) | Zero-dependency parser for the NCBI GenBank flat-file format. Spli… | [![npm](https://img.shields.io/npm/v/@ncbijs/genbank)](https://www.npmjs.com/package/@ncbijs/genbank) |
| [`@ncbijs/geo`](./packages/geo) | Typed client for NCBI Gene Expression Omnibus (GEO) — search and f… | [![npm](https://img.shields.io/npm/v/@ncbijs/geo)](https://www.npmjs.com/package/@ncbijs/geo) |
| [`@ncbijs/gtr`](./packages/gtr) | Typed client for the NCBI Genetic Testing Registry (GTR) — search… | [![npm](https://img.shields.io/npm/v/@ncbijs/gtr)](https://www.npmjs.com/package/@ncbijs/gtr) |
| [`@ncbijs/http-mcp`](./packages/http-mcp) | Model Context Protocol server exposing ncbijs domain packages as L… | [![npm](https://img.shields.io/npm/v/@ncbijs/http-mcp)](https://www.npmjs.com/package/@ncbijs/http-mcp) |
| [`@ncbijs/icite`](./packages/icite) | Typed client for the NIH iCite API. Retrieve citation metrics — Re… | [![npm](https://img.shields.io/npm/v/@ncbijs/icite)](https://www.npmjs.com/package/@ncbijs/icite) |
| [`@ncbijs/id-converter`](./packages/id-converter) | Batch conversion between PMID, PMCID, DOI, and NIH Manuscript ID v… | [![npm](https://img.shields.io/npm/v/@ncbijs/id-converter)](https://www.npmjs.com/package/@ncbijs/id-converter) |
| [`@ncbijs/jats`](./packages/jats) | Parser for JATS XML (NISO Z39.96) full-text articles with markdown… | [![npm](https://img.shields.io/npm/v/@ncbijs/jats)](https://www.npmjs.com/package/@ncbijs/jats) |
| [`@ncbijs/litvar`](./packages/litvar) | LitVar2 client — links genetic variants (rsIDs) to PubMed/PMC lite… | [![npm](https://img.shields.io/npm/v/@ncbijs/litvar)](https://www.npmjs.com/package/@ncbijs/litvar) |
| [`@ncbijs/medgen`](./packages/medgen) | Typed client for NCBI MedGen medical-genetics concepts — search an… | [![npm](https://img.shields.io/npm/v/@ncbijs/medgen)](https://www.npmjs.com/package/@ncbijs/medgen) |
| [`@ncbijs/mesh`](./packages/mesh) | NLM Medical Subject Headings (MeSH) vocabulary — tree traversal, q… | [![npm](https://img.shields.io/npm/v/@ncbijs/mesh)](https://www.npmjs.com/package/@ncbijs/mesh) |
| [`@ncbijs/nlm-catalog`](./packages/nlm-catalog) | Typed client for NLM Catalog — search and fetch journal and serial… | [![npm](https://img.shields.io/npm/v/@ncbijs/nlm-catalog)](https://www.npmjs.com/package/@ncbijs/nlm-catalog) |
| [`@ncbijs/nucleotide`](./packages/nucleotide) | Typed client for the NCBI Nucleotide database. Fetches DNA/RNA seq… | [![npm](https://img.shields.io/npm/v/@ncbijs/nucleotide)](https://www.npmjs.com/package/@ncbijs/nucleotide) |
| [`@ncbijs/omim`](./packages/omim) | Typed client for NCBI OMIM (Online Mendelian Inheritance in Man) —… | [![npm](https://img.shields.io/npm/v/@ncbijs/omim)](https://www.npmjs.com/package/@ncbijs/omim) |
| [`@ncbijs/pipeline`](./packages/pipeline) | Composable streaming ETL primitive — Source → Parse → Sink. Zero d… | [![npm](https://img.shields.io/npm/v/@ncbijs/pipeline)](https://www.npmjs.com/package/@ncbijs/pipeline) |
| [`@ncbijs/pmc`](./packages/pmc) | PMC full-text article retrieval over three NCBI surfaces (E-utilit… | [![npm](https://img.shields.io/npm/v/@ncbijs/pmc)](https://www.npmjs.com/package/@ncbijs/pmc) |
| [`@ncbijs/protein`](./packages/protein) | Typed client for the NCBI Protein database. Fetches sequences via… | [![npm](https://img.shields.io/npm/v/@ncbijs/protein)](https://www.npmjs.com/package/@ncbijs/protein) |
| [`@ncbijs/pubchem`](./packages/pubchem) | Typed client for the PubChem PUG REST and PUG View APIs — compound… | [![npm](https://img.shields.io/npm/v/@ncbijs/pubchem)](https://www.npmjs.com/package/@ncbijs/pubchem) |
| [`@ncbijs/pubmed`](./packages/pubmed) | High-level PubMed search and retrieval client. Fluent query builde… | [![npm](https://img.shields.io/npm/v/@ncbijs/pubmed)](https://www.npmjs.com/package/@ncbijs/pubmed) |
| [`@ncbijs/pubmed-xml`](./packages/pubmed-xml) | Spec-compliant pure parser for PubMed/MEDLINE XML and MEDLINE plai… | [![npm](https://img.shields.io/npm/v/@ncbijs/pubmed-xml)](https://www.npmjs.com/package/@ncbijs/pubmed-xml) |
| [`@ncbijs/pubtator`](./packages/pubtator) | Client for the PubTator3 text-mining API — biomedical entity autoc… | [![npm](https://img.shields.io/npm/v/@ncbijs/pubtator)](https://www.npmjs.com/package/@ncbijs/pubtator) |
| [`@ncbijs/rate-limiter`](./packages/rate-limiter) | Zero-dependency token-bucket rate limiter and retry-aware fetch he… | [![npm](https://img.shields.io/npm/v/@ncbijs/rate-limiter)](https://www.npmjs.com/package/@ncbijs/rate-limiter) |
| [`@ncbijs/rxnorm`](./packages/rxnorm) | Typed client for the NLM RxNav RxNorm REST API. Resolve drug names… | [![npm](https://img.shields.io/npm/v/@ncbijs/rxnorm)](https://www.npmjs.com/package/@ncbijs/rxnorm) |
| [`@ncbijs/snp`](./packages/snp) | NCBI dbSNP Variation Services API client (RefSNP reports, allele p… | [![npm](https://img.shields.io/npm/v/@ncbijs/snp)](https://www.npmjs.com/package/@ncbijs/snp) |
| [`@ncbijs/sra`](./packages/sra) | Typed client for NCBI SRA (Sequence Read Archive) — search and fet… | [![npm](https://img.shields.io/npm/v/@ncbijs/sra)](https://www.npmjs.com/package/@ncbijs/sra) |
| [`@ncbijs/store`](./packages/store) | Storage interfaces (Storage / ReadableStorage / WritableStorage /… | [![npm](https://img.shields.io/npm/v/@ncbijs/store)](https://www.npmjs.com/package/@ncbijs/store) |
| [`@ncbijs/store-mcp`](./packages/store-mcp) | Model Context Protocol server exposing locally stored NCBI data (D… | [![npm](https://img.shields.io/npm/v/@ncbijs/store-mcp)](https://www.npmjs.com/package/@ncbijs/store-mcp) |
| [`@ncbijs/structure`](./packages/structure) | Typed client for NCBI Structure (MMDB / PDB) — search and fetch ma… | [![npm](https://img.shields.io/npm/v/@ncbijs/structure)](https://www.npmjs.com/package/@ncbijs/structure) |
| [`@ncbijs/sync`](./packages/sync) | NCBI update detection and scheduled re-sync. Polls upstream source… | [![npm](https://img.shields.io/npm/v/@ncbijs/sync)](https://www.npmjs.com/package/@ncbijs/sync) |
| [`@ncbijs/xml`](./packages/xml) | Zero-dependency regex-based XML reader for NCBI formats — no HTTP,… | [![npm](https://img.shields.io/npm/v/@ncbijs/xml)](https://www.npmjs.com/package/@ncbijs/xml) |
<!-- sync-docs:packages:end -->

## RAG integration

ncbijs is a **data access layer** for biomedical RAG pipelines. It provides the structured inputs that RAG systems need at every stage — you bring the embeddings model, vector database, and LLM:

| RAG stage    | What ncbijs provides                                                  | Packages                                  |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| **Ingest**   | Fetch full-text articles, chunk into passages, extract entities       | `pmc`, `jats`, `pubtator`, `mesh`         |
| **Retrieve** | Expand queries via MeSH hierarchy, enrich with gene/compound metadata | `mesh`, `datasets`, `pubchem`             |
| **Generate** | LLM calls MCP tools to verify claims, look up data, format citations  | `http-mcp`, `cite`, `pmc`, `id-converter` |

ncbijs does **not** do embeddings, vector search, or re-ranking — those are infrastructure concerns that belong in your vector database and LLM orchestrator.

See **[RAG Integration Guide](./docs/rag-integration.md)** for a full architecture walkthrough with code examples and diagrams.

## Data pipelines

ncbijs includes a composable pipeline system for processing bulk NCBI data. Wire any source, parser, and sink together with a single `pipeline()` call. The pipeline package is 100% browser-compatible — every export uses standard Web APIs (`fetch`, `DecompressionStream`).

```typescript
import { pipeline, createHttpSource, createSink } from '@ncbijs/pipeline';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';

// Download from NCBI HTTP → parse → write to any destination
await pipeline(
  createHttpSource('https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2026.xml'),
  (xml) => parseMeshDescriptorXml(xml).descriptors,
  createSink(async (records) => {
    console.log(`Received ${records.length} MeSH descriptors`);
  }),
);
```

Or skip the wiring entirely with `@ncbijs/etl` — one function call to download, parse, and sink any dataset:

```typescript
import { load, loadAll } from '@ncbijs/etl';
import { createSink } from '@ncbijs/pipeline';

// Load a single dataset
await load(
  'mesh',
  createSink(async (records) => {
    console.log(`${records.length} MeSH descriptors`);
  }),
);

// Load all 6 datasets into any sink
await loadAll((dataset) =>
  createSink(async (records) => {
    console.log(`${dataset}: ${records.length} records`);
  }),
);
```

The pipeline has three phases: **load**, **sync**, and **query**:

```
Phase 1: Initial Load        Phase 2: Watch & Sync       Phase 3: Query via MCP
  NCBI FTP ──→ DuckDB          Poll NCBI → re-load         store-mcp ──→ Claude
  (one-time bulk download)      (long-running process)      (zero rate limits)
```

### Phase 1: Load data with `@ncbijs/etl`

```typescript
import { load, loadAll } from '@ncbijs/etl';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('ncbi.duckdb');

// Load a single dataset
await load('clinvar', storage.createSink('clinvar'));

// Or load all 6 datasets at once
await loadAll((dataset) => storage.createSink(dataset));
```

### Phase 2: Keep data fresh with `@ncbijs/sync`

Once loaded, start a watcher to poll for upstream changes and re-load only what changed. `createCheckers()` picks the best detection strategy per dataset: **MD5 checksums** for ClinVar, Taxonomy, and PubChem; **HTTP `Last-Modified`** for all others.

```typescript
import { createCheckers, load } from '@ncbijs/etl';
import { SyncScheduler, InMemorySyncState } from '@ncbijs/sync';

const scheduler = new SyncScheduler(new InMemorySyncState(), createCheckers(), {
  checkIntervalMs: 3600_000,
  datasets: ['clinvar', 'genes'],
  onUpdate: async (dataset) => {
    await load(dataset, storage.createSink(dataset));
  },
});

await scheduler.start(); // checks immediately, then every hour
```

### Phase 3: Query via MCP

Once data is loaded, expose it to Claude (or any MCP-compatible agent) with `@ncbijs/store-mcp`:

```json
{
  "mcpServers": {
    "ncbijs-store": {
      "command": "npx",
      "args": ["-y", "@ncbijs/store-mcp"],
      "env": {
        "NCBIJS_DB_PATH": "/absolute/path/to/ncbi.duckdb"
      }
    }
  }
}
```

Now your agent can query the local data directly:

- _"Search for pathogenic BRCA1 variants in ClinVar"_
- _"Look up the MeSH descriptor for Alzheimer's disease"_
- _"What genes are on chromosome 17 in the local store?"_
- _"Convert PMID 33024307 to a DOI"_

No network, no rate limits, no API keys. See [`@ncbijs/store-mcp`](./packages/store-mcp) for the full list of 13 query tools.

See [`examples/data-pipeline/`](./examples/data-pipeline/) for complete scripts covering all three phases.

### Packages

- **`@ncbijs/pipeline`** — Composable Source/Sink primitives built on `AsyncIterable`. HTTP and composite sources, streaming, backpressure, abort signals. Browser + Node.js.
- **`@ncbijs/etl`** — Pre-wired loaders for 6 NCBI bulk datasets. `load('mesh', mySink)` is all you need. Also exports `createCheckers()` for sync.
- **`@ncbijs/store`** — Storage interfaces with a DuckDB reference implementation. Node.js only.
- **`@ncbijs/sync`** — Watches NCBI FTP for updates via MD5 checksums or HTTP `Last-Modified`. Pluggable checkers, configurable interval, abort signal.

See **[Data Pipeline Guide](./docs/pipeline.md)** for the full API walkthrough, streaming parsers, error handling, and sync scheduling.

## MCP servers

ncbijs ships two MCP servers that give AI agents direct access to NCBI data. Pick the one that fits your use case — or use both:

|                    | Live API (`http-mcp`)                     | Local data (`store-mcp`)     |
| ------------------ | ----------------------------------------- | ---------------------------- |
| **Setup**          | Zero — just add the config                | Load data first (Phases 1-2) |
| **Network**        | Required (queries NCBI APIs in real time) | Offline after initial load   |
| **Rate limits**    | NCBI limits apply (3-10 req/s)            | None                         |
| **Data freshness** | Always current                            | As fresh as last sync        |
| **Tools**          | 27                                        | 13                           |

### Live API access (`@ncbijs/http-mcp`)

Query NCBI APIs in real time — PubMed, PMC full text, BLAST, ClinVar, PubChem, MeSH, and more. No data loading required.

```json
{
  "mcpServers": {
    "ncbijs": {
      "command": "npx",
      "args": ["-y", "@ncbijs/http-mcp"],
      "env": {
        "NCBI_API_KEY": ""
      }
    }
  }
}
```

27 tools covering: PubMed search, PMC full text, PubTator entity recognition, gene/genome/taxonomy lookup, BLAST alignment, SNP/ClinVar variant queries, PubChem compounds, citation formatting, ID conversion, MeSH vocabulary, iCite metrics, RxNorm drug data, and LitVar variant-literature linking.

Example prompts:

- _"Search PubMed for recent CRISPR gene therapy reviews"_
- _"Get the full text of PMC7886120 and summarize the methods"_
- _"What genes and diseases are mentioned in PMID 33024307?"_
- _"Run a BLAST search for the sequence ATCGATCGATCG"_

See [`@ncbijs/http-mcp`](./packages/http-mcp) for details. Get a free API key at [ncbi.nlm.nih.gov/account/settings](https://www.ncbi.nlm.nih.gov/account/settings/).

### Local data queries (`@ncbijs/store-mcp`)

Query your local DuckDB database — MeSH, ClinVar, genes, taxonomy, PubChem, and ID mappings. No network needed after loading.

```
Phase 1: load data ──→ Phase 2: sync ──→ Phase 3: query via store-mcp
(see Data pipelines)    (optional)        (this section)
```

```json
{
  "mcpServers": {
    "ncbijs-store": {
      "command": "npx",
      "args": ["-y", "@ncbijs/store-mcp"],
      "env": {
        "NCBIJS_DB_PATH": "/absolute/path/to/ncbi.duckdb"
      }
    }
  }
}
```

13 tools available: `store-lookup-mesh`, `store-search-mesh`, `store-lookup-variant`, `store-search-variants`, `store-lookup-gene`, `store-search-genes`, `store-lookup-taxonomy`, `store-search-taxonomy`, `store-lookup-compound`, `store-search-compounds`, `store-convert-ids`, `store-search-ids`, `store-stats`.

Example prompts:

- _"Search for pathogenic BRCA1 variants in the local ClinVar data"_
- _"What compounds have an InChI key starting with BSYNRYMUT?"_
- _"How many records are loaded in each dataset?"_

See [`@ncbijs/store-mcp`](./packages/store-mcp) for details. See [Data pipelines](#data-pipelines) above to load the data.

## Browser compatibility

40 of 43 packages work in both browsers and Node.js. Only 3 infrastructure packages require Node.js:

| Runtime               | Packages                                                                                        | Why                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Browser + Node.js** | All HTTP clients, parsers, rate-limiter, xml, fasta, genbank, pipeline, etl, sync (40 packages) | Only uses `fetch`, `DecompressionStream`, and pure computation |
| **Node.js only**      | `@ncbijs/store`                                                                                 | Requires `@duckdb/node-api` (native binding)                   |
| **Node.js only**      | `@ncbijs/store-mcp`, `@ncbijs/http-mcp`                                                         | MCP server CLIs (stdio transport)                              |

Use ncbijs directly in frontend apps — search PubMed, look up genes, query MeSH, and more with zero server-side code:

```typescript
import { PubMed } from '@ncbijs/pubmed';
import { Datasets } from '@ncbijs/datasets';

const pubmed = new PubMed();
const articles = await pubmed.search({ term: 'CRISPR therapy', retmax: 10 });

const datasets = new Datasets();
const gene = await datasets.geneBySymbol('BRCA1');
```

## Quick start

```bash
npm install @ncbijs/pubmed
```

```typescript
import { PubMed } from '@ncbijs/pubmed';

const pubmed = new PubMed({
  tool: 'my-research-app',
  email: 'you@university.edu',
});

const articles = await pubmed
  .search('CRISPR gene therapy')
  .dateRange('2023/01/01', '2024/12/31')
  .freeFullText()
  .limit(10)
  .fetchAll();

for (const article of articles) {
  console.log(`${article.pmid}: ${article.title}`);
}
```

## Which package do I need?

<!-- sync-docs:decision-tree:start -->
```
I want to...
│
├── Search biomedical literature
│   ├── High-level PubMed search ────────────────→ @ncbijs/pubmed
│   ├── Low-level Entrez queries ────────────────→ @ncbijs/eutils
│   └── Find literature by genetic variant ──────→ @ncbijs/litvar
│
├── Retrieve full-text articles
│   ├── PMC open-access articles ────────────────→ @ncbijs/pmc
│   └── Annotated text with NER ─────────────────→ @ncbijs/bioc
│
├── Extract entities from text
│   ├── Genes, diseases, chemicals ──────────────→ @ncbijs/pubtator
│   └── Annotated passages (BioC format) ────────→ @ncbijs/bioc
│
├── Work with citations
│   ├── Format citations (RIS, CSL, etc.) ───────→ @ncbijs/cite
│   ├── Convert PMID/PMCID/DOI ──────────────────→ @ncbijs/id-converter
│   └── Citation impact metrics (RCR) ───────────→ @ncbijs/icite
│
├── Work with genes and sequences
│   ├── Gene/genome metadata ────────────────────→ @ncbijs/datasets
│   ├── Protein sequences ───────────────────────→ @ncbijs/protein
│   ├── Nucleotide sequences ────────────────────→ @ncbijs/nucleotide
│   ├── Sequence alignment (BLAST) ──────────────→ @ncbijs/blast
│   ├── Parse FASTA format ──────────────────────→ @ncbijs/fasta
│   └── Parse GenBank format ────────────────────→ @ncbijs/genbank
│
├── Work with variants and clinical data
│   ├── SNP/variant lookup (dbSNP) ──────────────→ @ncbijs/snp
│   ├── HGVS/SPDI/VCF conversion ────────────────→ @ncbijs/snp
│   ├── Clinical significance (ClinVar) ─────────→ @ncbijs/clinvar
│   ├── Genetic disorders (OMIM) ────────────────→ @ncbijs/omim
│   └── Medical genetics (MedGen) ───────────────→ @ncbijs/medgen
│
├── Work with drugs and chemicals
│   ├── Compound properties ─────────────────────→ @ncbijs/pubchem
│   ├── Compound annotations (GHS, etc.) ────────→ @ncbijs/pubchem
│   ├── Drug normalization (RxCUI) ──────────────→ @ncbijs/rxnorm
│   ├── Drug classes (ATC, VA, MEDRT) ───────────→ @ncbijs/rxnorm
│   ├── NDC code lookup ─────────────────────────→ @ncbijs/rxnorm
│   └── Drug labels and SPLs ────────────────────→ @ncbijs/dailymed
│
├── Autocomplete medical codes
│   ├── ICD-10, LOINC, SNOMED ───────────────────→ @ncbijs/clinical-tables
│   └── RxTerms drug names ──────────────────────→ @ncbijs/clinical-tables
│
├── Search clinical trials ──────────────────→ @ncbijs/clinical-trials
│
├── Work with vocabularies
│   └── MeSH term expansion ─────────────────────→ @ncbijs/mesh
│
├── Search other NCBI databases
│   ├── Gene expression (GEO) ───────────────────→ @ncbijs/geo
│   ├── Structural variants (dbVar) ─────────────→ @ncbijs/dbvar
│   ├── Sequencing data (SRA) ───────────────────→ @ncbijs/sra
│   ├── 3D structures (MMDB/PDB) ────────────────→ @ncbijs/structure
│   ├── Protein domains (CDD) ───────────────────→ @ncbijs/cdd
│   ├── Genetic tests (GTR) ─────────────────────→ @ncbijs/gtr
│   ├── Books/textbooks ─────────────────────────→ @ncbijs/books
│   └── Journal records (NLM Catalog) ───────────→ @ncbijs/nlm-catalog
│
├── Store NCBI data locally ─────────────────→ @ncbijs/store
│
├── Query stored data with same API ─────────→ fromStorage() on domain packages
│
├── Data pipeline (Source → Parse → Sink) ───→ @ncbijs/pipeline
│
├── Load any NCBI dataset in one call ───────→ @ncbijs/etl
│
├── Watch NCBI sources for updates ──────────→ @ncbijs/sync
│
├── Expose tools to LLM agents (live API) ───→ @ncbijs/http-mcp
│
└── Query local data via MCP ────────────────→ @ncbijs/store-mcp
```
<!-- sync-docs:decision-tree:end -->

### Package capabilities

| Capability        | Packages                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supports API key  | `eutils`, `pubmed`, `pmc`, `clinvar`, `snp`, `datasets`, `omim`, `medgen`, `gtr`, `geo`, `dbvar`, `sra`, `structure`, `cdd`, `books`, `nlm-catalog`, `protein`, `nucleotide` (optional, for higher rate limits) |
| No API key needed | All others (non-NCBI APIs)                                                                                                                                                                                      |
| Rate-limited      | `eutils`, `datasets`, `blast`, `snp`, `clinvar`, `pubchem`, `clinical-trials`, `icite`, `rxnorm`, `dailymed`, + all that depend on `rate-limiter`                                                               |
| Zero dependencies | `pipeline`, `sync`, `cite`, `id-converter`, `mesh`, `fasta`, `genbank`, `litvar`, `bioc`, `clinical-tables`                                                                                                     |
| Async iterators   | `eutils` (efetchBatches, searchAndFetch, searchAndSummarize), `pubmed` (batch), `clinical-trials` (searchStudies), `cite` (citeMany), `pipeline` (Source, streamParser)                                         |
| XML parsing       | `eutils`, `pubmed-xml`, `jats`, `pubtator`, `xml`                                                                                                                                                               |
| Bulk parsers      | `mesh`, `cite`, `id-converter`, `clinvar`, `datasets`, `pubchem`, `snp`, `icite`, `clinical-trials`, `litvar`, `medgen`, `cdd`, `pmc`                                                                           |
| Data pipelines    | `pipeline` (Source → Parse → Sink), `store` (DuckDbSink), `sync` (update detection)                                                                                                                             |

## Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
```

### Single package

```bash
pnpm nx run @ncbijs/pubmed:build
pnpm nx run @ncbijs/pubmed:test
```

### E2E tests

E2E tests hit real NCBI APIs and require an API key:

```bash
cp .env.example .env
# Add your NCBI API key to .env
pnpm nx run ncbijs-e2e:e2e
```

Get an API key at [ncbi.nlm.nih.gov/account/settings](https://www.ncbi.nlm.nih.gov/account/settings/).
