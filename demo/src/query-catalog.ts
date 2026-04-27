export interface QueryExample {
  readonly label: string;
  readonly placeholder: string;
  readonly defaultInput: string;
  readonly liveHandler?: string;
  readonly localSql?: string;
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
    label: 'Look up gene TP53',
    placeholder: 'Enter a gene symbol...',
    defaultInput: 'TP53',
    liveHandler: 'gene-search',
    localSql: `SELECT gene_id, symbol, description, tax_name, chromosomes, synonyms FROM genes WHERE symbol = '{{input}}' LIMIT 50`,
  },
  {
    label: 'ClinVar variants for BRCA1',
    placeholder: 'Enter a gene name...',
    defaultInput: 'BRCA1',
    liveHandler: 'clinvar-search',
    localSql: `SELECT uid, title, clinical_significance, genes, traits FROM clinvar_variants WHERE title ILIKE '%{{input}}%' OR genes ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Convert PMID 35296856',
    placeholder: 'Enter a PMID...',
    defaultInput: '35296856',
    liveHandler: 'id-convert',
    localSql: `SELECT pmid, pmcid, doi FROM id_mappings WHERE pmid = '{{input}}' OR pmcid = '{{input}}' LIMIT 50`,
  },
  {
    label: 'Search PubMed for CRISPR',
    placeholder: 'Search PubMed articles...',
    defaultInput: 'CRISPR gene editing',
    liveHandler: 'pubmed-search',
  },
  {
    label: 'Look up SNP rs7412',
    placeholder: 'Enter an rsID (e.g. rs7412)...',
    defaultInput: 'rs7412',
    liveHandler: 'snp-lookup',
  },
  {
    label: 'Search PubChem for aspirin',
    placeholder: 'Search for a compound...',
    defaultInput: 'aspirin',
    liveHandler: 'compound-search',
  },
  {
    label: 'Free SQL query',
    placeholder: 'Enter a SQL query against the local DuckDB...',
    defaultInput: `SELECT 'mesh_descriptors' AS "table", COUNT(*) AS records FROM mesh_descriptors
UNION ALL SELECT 'genes', COUNT(*) FROM genes
UNION ALL SELECT 'clinvar_variants', COUNT(*) FROM clinvar_variants
UNION ALL SELECT 'id_mappings', COUNT(*) FROM id_mappings`,
    localSql: '{{input}}',
  },
];

export function getExamplesForMode(mode: 'live' | 'local'): ReadonlyArray<QueryExample> {
  if (mode === 'live') {
    return QUERY_CATALOG.filter((example) => example.liveHandler !== undefined);
  }
  return QUERY_CATALOG.filter((example) => example.localSql !== undefined);
}

export function getDualExamples(): ReadonlyArray<QueryExample> {
  return QUERY_CATALOG.filter(
    (example) => example.liveHandler !== undefined && example.localSql !== undefined,
  );
}

export interface BuiltQuery {
  readonly sql: string;
  readonly params: ReadonlyArray<unknown>;
}

export function buildQuery(example: QueryExample, input: string): BuiltQuery | undefined {
  if (example.localSql === undefined) {
    return undefined;
  }

  if (example.localSql === '{{input}}') {
    return { sql: input, params: [] };
  }

  return {
    sql: example.localSql.replaceAll('{{input}}', input),
    params: [],
  };
}
