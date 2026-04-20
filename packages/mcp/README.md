<h1 align="center">@ncbijs/mcp</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/mcp"><img src="https://img.shields.io/npm/v/@ncbijs/mcp" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/mcp"><img src="https://img.shields.io/npm/dm/@ncbijs/mcp" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/mcp" alt="license" /></a>
</p>

<p align="center">
  MCP server exposing NCBI biomedical and genomic tools for LLM agents.
</p>

---

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants access to NCBI's biomedical databases — PubMed (37M+ articles), PubMed Central (full text), PubTator3 (entity recognition), MeSH (medical vocabulary), BLAST (sequence alignment), dbSNP (genetic variation), ClinVar (clinical variants), PubChem (chemical compounds), Datasets (genes, genomes, taxonomy), and more.

## Quick start

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "ncbijs": {
      "command": "npx",
      "args": ["-y", "@ncbijs/mcp"],
      "env": {
        "NCBI_API_KEY": "",
        "NCBI_TOOL": "my-app",
        "NCBI_EMAIL": "you@example.com"
      }
    }
  }
}
```

## Environment variables

| Variable       | Required | Default                               | Description                                         |
| -------------- | -------- | ------------------------------------- | --------------------------------------------------- |
| `NCBI_API_KEY` | No       | --                                    | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `NCBI_TOOL`    | No       | `ncbijs-mcp`                          | Application name (NCBI usage policy)                |
| `NCBI_EMAIL`   | No       | `ncbijs-mcp@users.noreply.github.com` | Developer email (NCBI usage policy)                 |

Get a free API key at https://www.ncbi.nlm.nih.gov/account/settings/

## Available tools

### Literature search

| Tool             | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `search-pubmed`  | Search PubMed for biomedical articles with filters (date, sort, limit) |
| `search-related` | Find articles related to a given PubMed article, ranked by relevancy   |
| `get-references` | Get the reference list of a PubMed article                             |
| `get-cited-by`   | Get articles that cite a given PubMed article                          |

### Full text

| Tool                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `get-full-text`        | Fetch PMC full-text article as markdown                          |
| `get-full-text-chunks` | Fetch PMC full-text article split into semantic chunks (for RAG) |

### Entity recognition

| Tool                 | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `find-entity`        | Search biomedical entities (genes, diseases, chemicals) by name |
| `annotate-text`      | Annotate free text with biomedical named entity recognition     |
| `export-annotations` | Export BioC annotations for PubMed articles                     |

### Genomics (NCBI Datasets API v2)

| Tool              | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `search-gene`     | Retrieve gene metadata by NCBI Gene ID or symbol + taxon           |
| `lookup-taxonomy` | Retrieve taxonomy data (organism name, rank, lineage, gene counts) |
| `search-genome`   | Retrieve genome assembly reports by accession or taxon             |

### Sequence alignment (BLAST)

| Tool           | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `blast-search` | Run a BLAST sequence alignment (blastn, blastp, blastx, tblastn, etc) |

### Variation and clinical genomics

| Tool             | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `lookup-variant` | Look up SNP data by RS IDs — placements, allele annotations, frequencies |
| `search-clinvar` | Search ClinVar for clinical variant significance, genes, and traits      |

### Chemistry (PubChem)

| Tool              | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `search-compound` | Look up chemical compounds by name or CID — properties, synonyms |

### Utilities

| Tool           | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `convert-ids`  | Convert between PMID, PMCID, DOI, and Manuscript IDs             |
| `get-citation` | Get formatted citation (CSL-JSON, APA/MLA/AMA/NLM, RIS, MEDLINE) |
| `mesh-lookup`  | Look up MeSH medical vocabulary terms by name                    |
| `mesh-sparql`  | Execute SPARQL queries against the NLM MeSH vocabulary           |

## Example prompts

Once the MCP server is configured, you can ask your AI assistant things like:

- "Search PubMed for recent reviews on CRISPR gene therapy"
- "Get the full text of PMC7886120 and summarize the methods section"
- "What genes and diseases are mentioned in PMID 33024307?"
- "Find the DOI for PMID 33024307"
- "Get an APA citation for PMID 33024307"
- "What MeSH terms relate to Alzheimer's disease?"
- "Find articles related to PMID 33024307"
- "Look up the BRCA1 gene"
- "What genome assemblies exist for E. coli?"
- "Get the taxonomy for Homo sapiens"
- "Run a BLAST search for the sequence ATCGATCGATCG"
- "What do we know about SNP rs7412?"
- "Look up the clinical significance of BRCA1 variants in ClinVar"
- "What are the properties of aspirin in PubChem?"
