export interface QueryExample {
  readonly label: string;
  readonly placeholder: string;
  readonly defaultInput: string;
  readonly liveHandler: string;
  readonly extractInput: (raw: string) => string;
}

function extractNumber(raw: string): string {
  const match = raw.match(/\d+/);
  return match?.[0] ?? raw;
}

function extractGeneSymbol(raw: string): string {
  const match = raw.match(/\b([A-Z][A-Z0-9]{1,10})\b/);
  return match?.[1] ?? raw;
}

export const QUERY_CATALOG: ReadonlyArray<QueryExample> = [
  {
    label: 'Find MeSH terms about Asthma',
    placeholder: 'e.g. "Find MeSH terms about Hypertension"',
    defaultInput: 'Find MeSH terms about Asthma',
    liveHandler: 'mesh-lookup',
    extractInput: (raw) => raw.replace(/^find mesh terms about\s*/i, '') || raw,
  },
  {
    label: 'Find MeSH terms about Diabetes',
    placeholder: 'e.g. "Find MeSH terms about Epilepsy"',
    defaultInput: 'Find MeSH terms about Diabetes',
    liveHandler: 'mesh-lookup',
    extractInput: (raw) => raw.replace(/^find mesh terms about\s*/i, '') || raw,
  },
  {
    label: 'Look up gene TP53',
    placeholder: 'e.g. "Look up gene EGFR"',
    defaultInput: 'Look up gene TP53',
    liveHandler: 'gene-search',
    extractInput: extractGeneSymbol,
  },
  {
    label: 'Find gene by ID 672',
    placeholder: 'e.g. "Find gene by ID 7157"',
    defaultInput: 'Find gene by ID 672',
    liveHandler: 'gene-by-id',
    extractInput: extractNumber,
  },
  {
    label: 'ClinVar variants for BRCA1',
    placeholder: 'e.g. "ClinVar variants for KRAS"',
    defaultInput: 'ClinVar variants for BRCA1',
    liveHandler: 'clinvar-search',
    extractInput: extractGeneSymbol,
  },
  {
    label: 'ClinVar variants for TP53',
    placeholder: 'e.g. "ClinVar variants for PTEN"',
    defaultInput: 'ClinVar variants for TP53',
    liveHandler: 'clinvar-search',
    extractInput: extractGeneSymbol,
  },
  {
    label: 'Look up compound aspirin (CID 2244)',
    placeholder: 'e.g. "Look up compound ibuprofen (CID 3672)"',
    defaultInput: 'Look up compound aspirin (CID 2244)',
    liveHandler: 'compound-lookup',
    extractInput: extractNumber,
  },
  {
    label: 'Look up compound caffeine (CID 2519)',
    placeholder: 'e.g. "Look up compound metformin (CID 4091)"',
    defaultInput: 'Look up compound caffeine (CID 2519)',
    liveHandler: 'compound-lookup',
    extractInput: extractNumber,
  },
  {
    label: 'Look up organism Homo sapiens',
    placeholder: 'e.g. "Look up organism Mus musculus"',
    defaultInput: 'Look up organism Homo sapiens',
    liveHandler: 'taxonomy-lookup',
    extractInput: (raw) => raw.replace(/^look up organism\s*/i, '') || raw,
  },
  {
    label: 'Convert PMID 35296856 to other IDs',
    placeholder: 'e.g. "Convert PMID 33533846 to other IDs"',
    defaultInput: 'Convert PMID 35296856 to other IDs',
    liveHandler: 'id-convert',
    extractInput: extractNumber,
  },
];

export function extractSearchTerm(example: QueryExample, rawInput: string): string {
  return example.extractInput(rawInput);
}
