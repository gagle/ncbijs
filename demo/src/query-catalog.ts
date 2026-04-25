export interface QueryExample {
  readonly label: string;
  readonly placeholder: string;
  readonly defaultInput: string;
  readonly mode: 'live' | 'local' | 'both';
  readonly liveHandler?: string;
  readonly localSql?: string;
}

export const QUERY_CATALOG: ReadonlyArray<QueryExample> = [
  {
    label: 'PubMed search',
    placeholder: 'Search PubMed articles...',
    defaultInput: 'BRCA1 breast cancer',
    mode: 'both',
    liveHandler: 'pubmed-search',
    localSql: `SELECT * FROM read_parquet('/data/pubmed-sample.parquet') LIMIT 50`,
  },
  {
    label: 'MeSH lookup',
    placeholder: 'Look up a MeSH term...',
    defaultInput: 'Asthma',
    mode: 'both',
    liveHandler: 'mesh-lookup',
    localSql: `SELECT * FROM read_parquet('/data/mesh.parquet') WHERE name ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'Gene search',
    placeholder: 'Search for a gene symbol...',
    defaultInput: 'TP53',
    mode: 'both',
    liveHandler: 'gene-search',
    localSql: `SELECT * FROM read_parquet('/data/genes.parquet') WHERE "Symbol" = '{{input}}' LIMIT 50`,
  },
  {
    label: 'ClinVar variants',
    placeholder: 'Search ClinVar for a gene...',
    defaultInput: 'BRCA2',
    mode: 'both',
    liveHandler: 'clinvar-search',
    localSql: `SELECT * FROM read_parquet('/data/clinvar.parquet') WHERE "GeneSymbol" ILIKE '%{{input}}%' LIMIT 50`,
  },
  {
    label: 'SNP lookup',
    placeholder: 'Enter an rsID (e.g. rs7412)...',
    defaultInput: 'rs7412',
    mode: 'live',
    liveHandler: 'snp-lookup',
  },
  {
    label: 'Compound search',
    placeholder: 'Search PubChem compounds...',
    defaultInput: 'aspirin',
    mode: 'both',
    liveHandler: 'compound-search',
    localSql: `SELECT * FROM read_parquet('/data/compounds.parquet') LIMIT 50`,
  },
  {
    label: 'ID converter',
    placeholder: 'Enter a PMID to convert...',
    defaultInput: '35296856',
    mode: 'live',
    liveHandler: 'id-convert',
  },
  {
    label: 'Free SQL',
    placeholder: 'Enter a SQL query against local Parquet files...',
    defaultInput: `SELECT 'mesh' AS dataset, COUNT(*) AS records FROM read_parquet('/data/mesh.parquet')`,
    mode: 'local',
    localSql: '{{input}}',
  },
];

export function getExamplesForMode(mode: 'live' | 'local'): ReadonlyArray<QueryExample> {
  return QUERY_CATALOG.filter((example) => example.mode === mode || example.mode === 'both');
}

export function buildSql(example: QueryExample, input: string): string | undefined {
  if (example.localSql === undefined) {
    return undefined;
  }
  return example.localSql.replace(/\{\{input\}\}/g, input.replace(/'/g, "''"));
}
