export interface QueryExample {
  readonly label: string;
  readonly placeholder: string;
  readonly defaultInput: string;
  readonly liveHandler: string;
  readonly localSql: string;
}

export const QUERY_CATALOG: ReadonlyArray<QueryExample> = [
  {
    label: 'Find MeSH terms about Asthma',
    placeholder: 'Enter a medical topic...',
    defaultInput: 'Asthma',
    liveHandler: 'mesh-lookup',
    localSql: `SELECT id, name FROM mesh_descriptors WHERE name ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Find MeSH terms about Diabetes',
    placeholder: 'Enter a medical topic...',
    defaultInput: 'Diabetes',
    liveHandler: 'mesh-lookup',
    localSql: `SELECT id, name FROM mesh_descriptors WHERE name ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Look up gene TP53',
    placeholder: 'Enter a gene symbol...',
    defaultInput: 'TP53',
    liveHandler: 'gene-search',
    localSql: `SELECT gene_id, symbol, description, tax_name, chromosomes, synonyms FROM genes WHERE symbol = '{{input}}' LIMIT 50`,
  },
  {
    label: 'Find gene by ID 672',
    placeholder: 'Enter an NCBI gene ID...',
    defaultInput: '672',
    liveHandler: 'gene-by-id',
    localSql: `SELECT gene_id, symbol, description, tax_name, chromosomes, synonyms FROM genes WHERE gene_id = {{input}}`,
  },
  {
    label: 'ClinVar variants for BRCA1',
    placeholder: 'Enter a gene name...',
    defaultInput: 'BRCA1',
    liveHandler: 'clinvar-search',
    localSql: `SELECT uid, title, clinical_significance, genes, traits FROM clinvar_variants WHERE title ILIKE '%{{input}}%' OR genes ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'ClinVar variants for TP53',
    placeholder: 'Enter a gene name...',
    defaultInput: 'TP53',
    liveHandler: 'clinvar-search',
    localSql: `SELECT uid, title, clinical_significance, genes, traits FROM clinvar_variants WHERE title ILIKE '%{{input}}%' OR genes ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Look up compound CID 2244 (aspirin)',
    placeholder: 'Enter a PubChem CID...',
    defaultInput: '2244',
    liveHandler: 'compound-lookup',
    localSql: `SELECT cid, iupac_name, canonical_smiles, inchi_key FROM compounds WHERE cid = {{input}}`,
  },
  {
    label: 'Look up compound CID 2519 (caffeine)',
    placeholder: 'Enter a PubChem CID...',
    defaultInput: '2519',
    liveHandler: 'compound-lookup',
    localSql: `SELECT cid, iupac_name, canonical_smiles, inchi_key FROM compounds WHERE cid = {{input}}`,
  },
  {
    label: 'Look up organism Homo sapiens',
    placeholder: 'Enter an organism name...',
    defaultInput: 'Homo sapiens',
    liveHandler: 'taxonomy-lookup',
    localSql: `SELECT tax_id, organism_name, common_name, rank FROM taxonomy WHERE organism_name ILIKE '%{{input}}%' OR common_name ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Convert PMID 35296856',
    placeholder: 'Enter a PMID or PMCID...',
    defaultInput: '35296856',
    liveHandler: 'id-convert',
    localSql: `SELECT pmid, pmcid, doi FROM id_mappings WHERE pmid = '{{input}}' OR pmcid = '{{input}}' LIMIT 50`,
  },
];

export interface BuiltQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

export function buildQuery(example: QueryExample, input: string): BuiltQuery {
  return {
    sql: example.localSql.replaceAll('{{input}}', input),
    params: [],
  };
}
