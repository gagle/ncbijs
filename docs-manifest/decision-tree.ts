import type { DecisionTree } from './types';

/**
 * Decision tree for "Which package do I need?" — the routing fallback when
 * the workflow table doesn't match. Source of truth for the rendered ASCII
 * tree in root README.md and root CLAUDE.md.
 *
 * To add a new branch: append a child here, then run `pnpm sync-docs`.
 */
export const decisionTree: DecisionTree = {
  intent: 'I want to...',
  children: [
    {
      kind: 'group',
      intent: 'Search biomedical literature',
      children: [
        { kind: 'leaf', intent: 'High-level PubMed search', target: '@ncbijs/pubmed' },
        { kind: 'leaf', intent: 'Low-level Entrez queries', target: '@ncbijs/eutils' },
        { kind: 'leaf', intent: 'Find literature by genetic variant', target: '@ncbijs/litvar' },
      ],
    },
    {
      kind: 'group',
      intent: 'Retrieve full-text articles',
      children: [
        { kind: 'leaf', intent: 'PMC open-access articles', target: '@ncbijs/pmc' },
        { kind: 'leaf', intent: 'Annotated text with NER', target: '@ncbijs/bioc' },
      ],
    },
    {
      kind: 'group',
      intent: 'Extract entities from text',
      children: [
        { kind: 'leaf', intent: 'Genes, diseases, chemicals', target: '@ncbijs/pubtator' },
        { kind: 'leaf', intent: 'Annotated passages (BioC format)', target: '@ncbijs/bioc' },
      ],
    },
    {
      kind: 'group',
      intent: 'Work with citations',
      children: [
        { kind: 'leaf', intent: 'Format citations (RIS, CSL, etc.)', target: '@ncbijs/cite' },
        { kind: 'leaf', intent: 'Convert PMID/PMCID/DOI', target: '@ncbijs/id-converter' },
        { kind: 'leaf', intent: 'Citation impact metrics (RCR)', target: '@ncbijs/icite' },
      ],
    },
    {
      kind: 'group',
      intent: 'Work with genes and sequences',
      children: [
        { kind: 'leaf', intent: 'Gene/genome metadata', target: '@ncbijs/datasets' },
        { kind: 'leaf', intent: 'Protein sequences', target: '@ncbijs/protein' },
        { kind: 'leaf', intent: 'Nucleotide sequences', target: '@ncbijs/nucleotide' },
        { kind: 'leaf', intent: 'Sequence alignment (BLAST)', target: '@ncbijs/blast' },
        { kind: 'leaf', intent: 'Parse FASTA format', target: '@ncbijs/fasta' },
        { kind: 'leaf', intent: 'Parse GenBank format', target: '@ncbijs/genbank' },
      ],
    },
    {
      kind: 'group',
      intent: 'Work with variants and clinical data',
      children: [
        { kind: 'leaf', intent: 'SNP/variant lookup (dbSNP)', target: '@ncbijs/snp' },
        { kind: 'leaf', intent: 'HGVS/SPDI/VCF conversion', target: '@ncbijs/snp' },
        { kind: 'leaf', intent: 'Clinical significance (ClinVar)', target: '@ncbijs/clinvar' },
        { kind: 'leaf', intent: 'Genetic disorders (OMIM)', target: '@ncbijs/omim' },
        { kind: 'leaf', intent: 'Medical genetics (MedGen)', target: '@ncbijs/medgen' },
      ],
    },
    {
      kind: 'group',
      intent: 'Work with drugs and chemicals',
      children: [
        { kind: 'leaf', intent: 'Compound properties', target: '@ncbijs/pubchem' },
        { kind: 'leaf', intent: 'Compound annotations (GHS, etc.)', target: '@ncbijs/pubchem' },
        { kind: 'leaf', intent: 'Drug normalization (RxCUI)', target: '@ncbijs/rxnorm' },
        { kind: 'leaf', intent: 'Drug classes (ATC, VA, MEDRT)', target: '@ncbijs/rxnorm' },
        { kind: 'leaf', intent: 'NDC code lookup', target: '@ncbijs/rxnorm' },
        { kind: 'leaf', intent: 'Drug labels and SPLs', target: '@ncbijs/dailymed' },
      ],
    },
    {
      kind: 'group',
      intent: 'Autocomplete medical codes',
      children: [
        { kind: 'leaf', intent: 'ICD-10, LOINC, SNOMED', target: '@ncbijs/clinical-tables' },
        { kind: 'leaf', intent: 'RxTerms drug names', target: '@ncbijs/clinical-tables' },
      ],
    },
    { kind: 'leaf', intent: 'Search clinical trials', target: '@ncbijs/clinical-trials' },
    {
      kind: 'group',
      intent: 'Work with vocabularies',
      children: [{ kind: 'leaf', intent: 'MeSH term expansion', target: '@ncbijs/mesh' }],
    },
    {
      kind: 'group',
      intent: 'Search other NCBI databases',
      children: [
        { kind: 'leaf', intent: 'Gene expression (GEO)', target: '@ncbijs/geo' },
        { kind: 'leaf', intent: 'Structural variants (dbVar)', target: '@ncbijs/dbvar' },
        { kind: 'leaf', intent: 'Sequencing data (SRA)', target: '@ncbijs/sra' },
        { kind: 'leaf', intent: '3D structures (MMDB/PDB)', target: '@ncbijs/structure' },
        { kind: 'leaf', intent: 'Protein domains (CDD)', target: '@ncbijs/cdd' },
        { kind: 'leaf', intent: 'Genetic tests (GTR)', target: '@ncbijs/gtr' },
        { kind: 'leaf', intent: 'Books/textbooks', target: '@ncbijs/books' },
        { kind: 'leaf', intent: 'Journal records (NLM Catalog)', target: '@ncbijs/nlm-catalog' },
      ],
    },
    { kind: 'leaf', intent: 'Store NCBI data locally', target: '@ncbijs/store' },
    {
      kind: 'leaf',
      intent: 'Query stored data with same API',
      target: 'fromStorage() on domain packages',
    },
    {
      kind: 'leaf',
      intent: 'Data pipeline (Source → Parse → Sink)',
      target: '@ncbijs/pipeline',
    },
    { kind: 'leaf', intent: 'Load any NCBI dataset in one call', target: '@ncbijs/etl' },
    { kind: 'leaf', intent: 'Watch NCBI sources for updates', target: '@ncbijs/sync' },
    {
      kind: 'leaf',
      intent: 'Expose tools to LLM agents (live API)',
      target: '@ncbijs/http-mcp',
    },
    { kind: 'leaf', intent: 'Query local data via MCP', target: '@ncbijs/store-mcp' },
  ],
};
