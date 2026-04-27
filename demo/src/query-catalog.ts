export interface QueryExample {
  readonly label: string;
  readonly placeholder: string;
  readonly defaultInput: string;
  readonly liveHandler: string;
  readonly localSql: string;
  readonly extractInput: (raw: string) => string;
  readonly columnMap: Readonly<Record<string, string>>;
}

function extractNumber(raw: string): string {
  const match = raw.match(/\d+/);
  return match?.[0] ?? raw;
}

function extractGeneSymbol(raw: string): string {
  const match = raw.match(/\b([A-Z][A-Z0-9]{1,10})\b/);
  return match?.[1] ?? raw;
}

const MESH_COLUMNS: Readonly<Record<string, string>> = {
  id: 'id',
  name: 'name',
  tree_numbers: 'treeNumbers',
  qualifiers: 'qualifiers',
  pharmacological_actions: 'pharmacologicalActions',
  supplementary_concepts: 'supplementaryConcepts',
};

const GENE_COLUMNS: Readonly<Record<string, string>> = {
  gene_id: 'geneId',
  symbol: 'symbol',
  description: 'description',
  tax_name: 'taxName',
  chromosomes: 'chromosomes',
  synonyms: 'synonyms',
};

const CLINVAR_COLUMNS: Readonly<Record<string, string>> = {
  uid: 'uid',
  title: 'title',
  clinical_significance: 'clinicalSignificance',
  genes: 'genes',
  traits: 'traits',
};

const COMPOUND_COLUMNS: Readonly<Record<string, string>> = {
  cid: 'cid',
  iupac_name: 'iupacName',
  canonical_smiles: 'canonicalSmiles',
  inchi_key: 'inchiKey',
};

const TAXONOMY_COLUMNS: Readonly<Record<string, string>> = {
  tax_id: 'taxId',
  organism_name: 'organismName',
  common_name: 'commonName',
  rank: 'rank',
};

const ID_MAPPING_COLUMNS: Readonly<Record<string, string>> = {
  pmid: 'pmid',
  pmcid: 'pmcid',
  doi: 'doi',
};

export const QUERY_CATALOG: ReadonlyArray<QueryExample> = [
  {
    label: 'Find MeSH terms about Asthma',
    placeholder: 'e.g. "Find MeSH terms about Hypertension"',
    defaultInput: 'Find MeSH terms about Asthma',
    liveHandler: 'mesh-lookup',
    localSql: `SELECT id, name, tree_numbers, qualifiers, pharmacological_actions, supplementary_concepts FROM mesh_descriptors WHERE name ILIKE '%{{input}}%' LIMIT 50`,
    extractInput: (raw) => raw.replace(/^find mesh terms about\s*/i, '') || raw,
    columnMap: MESH_COLUMNS,
  },
  {
    label: 'Find MeSH terms about Diabetes',
    placeholder: 'e.g. "Find MeSH terms about Epilepsy"',
    defaultInput: 'Find MeSH terms about Diabetes',
    liveHandler: 'mesh-lookup',
    localSql: `SELECT id, name, tree_numbers, qualifiers, pharmacological_actions, supplementary_concepts FROM mesh_descriptors WHERE name ILIKE '%{{input}}%' LIMIT 50`,
    extractInput: (raw) => raw.replace(/^find mesh terms about\s*/i, '') || raw,
    columnMap: MESH_COLUMNS,
  },
  {
    label: 'Look up gene TP53',
    placeholder: 'e.g. "Look up gene EGFR"',
    defaultInput: 'Look up gene TP53',
    liveHandler: 'gene-search',
    localSql: `SELECT gene_id, symbol, description, tax_name, chromosomes, synonyms FROM genes WHERE symbol = '{{input}}' LIMIT 50`,
    extractInput: extractGeneSymbol,
    columnMap: GENE_COLUMNS,
  },
  {
    label: 'Find gene by ID 672',
    placeholder: 'e.g. "Find gene by ID 7157"',
    defaultInput: 'Find gene by ID 672',
    liveHandler: 'gene-by-id',
    localSql: `SELECT gene_id, symbol, description, tax_name, chromosomes, synonyms FROM genes WHERE gene_id = {{input}}`,
    extractInput: extractNumber,
    columnMap: GENE_COLUMNS,
  },
  {
    label: 'ClinVar variants for BRCA1',
    placeholder: 'e.g. "ClinVar variants for KRAS"',
    defaultInput: 'ClinVar variants for BRCA1',
    liveHandler: 'clinvar-search',
    localSql: `SELECT uid, title, clinical_significance, genes, traits FROM clinvar_variants WHERE title ILIKE '%{{input}}%' OR genes ILIKE '%{{input}}%' LIMIT 50`,
    extractInput: extractGeneSymbol,
    columnMap: CLINVAR_COLUMNS,
  },
  {
    label: 'ClinVar variants for TP53',
    placeholder: 'e.g. "ClinVar variants for PTEN"',
    defaultInput: 'ClinVar variants for TP53',
    liveHandler: 'clinvar-search',
    localSql: `SELECT uid, title, clinical_significance, genes, traits FROM clinvar_variants WHERE title ILIKE '%{{input}}%' OR genes ILIKE '%{{input}}%' LIMIT 50`,
    extractInput: extractGeneSymbol,
    columnMap: CLINVAR_COLUMNS,
  },
  {
    label: 'Look up compound aspirin (CID 2244)',
    placeholder: 'e.g. "Look up compound ibuprofen (CID 3672)"',
    defaultInput: 'Look up compound aspirin (CID 2244)',
    liveHandler: 'compound-lookup',
    localSql: `SELECT cid, iupac_name, canonical_smiles, inchi_key FROM compounds WHERE cid = {{input}}`,
    extractInput: extractNumber,
    columnMap: COMPOUND_COLUMNS,
  },
  {
    label: 'Look up compound caffeine (CID 2519)',
    placeholder: 'e.g. "Look up compound metformin (CID 4091)"',
    defaultInput: 'Look up compound caffeine (CID 2519)',
    liveHandler: 'compound-lookup',
    localSql: `SELECT cid, iupac_name, canonical_smiles, inchi_key FROM compounds WHERE cid = {{input}}`,
    extractInput: extractNumber,
    columnMap: COMPOUND_COLUMNS,
  },
  {
    label: 'Look up organism Homo sapiens',
    placeholder: 'e.g. "Look up organism Mus musculus"',
    defaultInput: 'Look up organism Homo sapiens',
    liveHandler: 'taxonomy-lookup',
    localSql: `SELECT tax_id, organism_name, common_name, rank FROM taxonomy WHERE organism_name ILIKE '%{{input}}%' OR common_name ILIKE '%{{input}}%' LIMIT 50`,
    extractInput: (raw) => raw.replace(/^look up organism\s*/i, '') || raw,
    columnMap: TAXONOMY_COLUMNS,
  },
  {
    label: 'Convert PMID 35296856 to other IDs',
    placeholder: 'e.g. "Convert PMID 33533846 to other IDs"',
    defaultInput: 'Convert PMID 35296856 to other IDs',
    liveHandler: 'id-convert',
    localSql: `SELECT pmid, pmcid, doi FROM id_mappings WHERE pmid = '{{input}}' OR pmcid = '{{input}}' LIMIT 50`,
    extractInput: extractNumber,
    columnMap: ID_MAPPING_COLUMNS,
  },
];

export interface BuiltQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

export function buildQuery(example: QueryExample, rawInput: string): BuiltQuery {
  const input = example.extractInput(rawInput);
  return {
    sql: example.localSql.replaceAll('{{input}}', input),
    params: [],
  };
}

export function extractSearchTerm(example: QueryExample, rawInput: string): string {
  return example.extractInput(rawInput);
}
