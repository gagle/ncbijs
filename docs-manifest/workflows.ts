import type { WorkflowEntry } from './types';

/**
 * Workflow → package mapping. Source of truth for the "What can you do
 * with ncbijs?" tables in root README.md and root CLAUDE.md.
 *
 * To add a new workflow: append a row here, then run `pnpm sync-docs`.
 */
export const workflows: ReadonlyArray<WorkflowEntry> = [
  {
    workflow: 'Search PubMed and retrieve article metadata',
    packages: ['@ncbijs/pubmed', '@ncbijs/eutils'],
  },
  {
    workflow: 'Fetch full-text articles from PMC',
    packages: ['@ncbijs/pmc', '@ncbijs/jats'],
  },
  {
    workflow: 'Extract genes, diseases, chemicals from articles',
    packages: ['@ncbijs/pubtator'],
  },
  {
    workflow: 'Generate formatted citations (RIS, MEDLINE, CSL-JSON)',
    packages: ['@ncbijs/cite'],
  },
  {
    workflow: 'Convert between PMID, PMCID, and DOI',
    packages: ['@ncbijs/id-converter'],
  },
  {
    workflow: 'Expand MeSH terms for comprehensive searches',
    packages: ['@ncbijs/mesh'],
  },
  {
    workflow: 'Chunk full-text articles for RAG pipelines',
    packages: ['@ncbijs/jats (toChunks)'],
  },
  {
    workflow: 'Look up genes, genomes, and taxonomy',
    packages: ['@ncbijs/datasets'],
  },
  {
    workflow: 'Parse FASTA nucleotide/protein sequences',
    packages: ['@ncbijs/fasta'],
  },
  {
    workflow: 'Run BLAST sequence alignments',
    packages: ['@ncbijs/blast'],
  },
  {
    workflow: 'Look up SNP/variant data from dbSNP',
    packages: ['@ncbijs/snp'],
  },
  {
    workflow: 'Query clinical variant significance from ClinVar',
    packages: ['@ncbijs/clinvar'],
  },
  {
    workflow: 'Retrieve compound, substance, and assay data',
    packages: ['@ncbijs/pubchem'],
  },
  {
    workflow: 'Fetch protein sequences in FASTA or GenBank format',
    packages: ['@ncbijs/protein'],
  },
  {
    workflow: 'Fetch nucleotide sequences in FASTA or GenBank format',
    packages: ['@ncbijs/nucleotide'],
  },
  {
    workflow: 'Parse GenBank flat file records locally',
    packages: ['@ncbijs/genbank'],
  },
  {
    workflow: 'Look up genetic disorders from OMIM',
    packages: ['@ncbijs/omim'],
  },
  {
    workflow: 'Query medical genetics concepts from MedGen',
    packages: ['@ncbijs/medgen'],
  },
  {
    workflow: 'Search genetic tests from GTR',
    packages: ['@ncbijs/gtr'],
  },
  {
    workflow: 'Search gene expression datasets from GEO',
    packages: ['@ncbijs/geo'],
  },
  {
    workflow: 'Query structural variants from dbVar',
    packages: ['@ncbijs/dbvar'],
  },
  {
    workflow: 'Search sequencing experiment metadata from SRA',
    packages: ['@ncbijs/sra'],
  },
  {
    workflow: 'Look up 3D molecular structures from MMDB/PDB',
    packages: ['@ncbijs/structure'],
  },
  {
    workflow: 'Search conserved protein domains from CDD',
    packages: ['@ncbijs/cdd'],
  },
  {
    workflow: 'Search NCBI Bookshelf entries',
    packages: ['@ncbijs/books'],
  },
  {
    workflow: 'Look up journal/serial records from NLM Catalog',
    packages: ['@ncbijs/nlm-catalog'],
  },
  {
    workflow: 'Convert variant notations (HGVS, SPDI, VCF)',
    packages: ['@ncbijs/snp'],
  },
  {
    workflow: 'Get full compound annotations (GHS, patents)',
    packages: ['@ncbijs/pubchem'],
  },
  {
    workflow: 'Chain search-fetch pipelines via History Server',
    packages: ['@ncbijs/eutils'],
  },
  {
    workflow: 'Search clinical trials by condition/intervention',
    packages: ['@ncbijs/clinical-trials'],
  },
  {
    workflow: 'Get citation metrics and impact scores',
    packages: ['@ncbijs/icite'],
  },
  {
    workflow: 'Normalize drug names and find drug classes',
    packages: ['@ncbijs/rxnorm'],
  },
  {
    workflow: 'Look up drug labels, SPLs, and NDC packaging',
    packages: ['@ncbijs/dailymed'],
  },
  {
    workflow: 'Find literature linked to genetic variants',
    packages: ['@ncbijs/litvar'],
  },
  {
    workflow: 'Get annotated text with entity recognition',
    packages: ['@ncbijs/bioc'],
  },
  {
    workflow: 'Autocomplete ICD-10, LOINC, SNOMED codes',
    packages: ['@ncbijs/clinical-tables'],
  },
  {
    workflow: 'Store NCBI data locally in DuckDB',
    packages: ['@ncbijs/store'],
  },
  {
    workflow: 'Query stored data with the same package API',
    packages: ['fromStorage() on domain packages'],
  },
  {
    workflow: 'Build data pipelines (Source → Parse → Sink)',
    packages: ['@ncbijs/pipeline'],
  },
  {
    workflow: 'Load any NCBI dataset with one function call',
    packages: ['@ncbijs/etl'],
  },
  {
    workflow: 'Watch NCBI sources for updates and re-sync',
    packages: ['@ncbijs/sync'],
  },
  {
    workflow: 'Expose all tools to LLM agents via MCP',
    packages: ['@ncbijs/http-mcp'],
  },
  {
    workflow: 'Query local NCBI data via MCP',
    packages: ['@ncbijs/store-mcp'],
  },
];
