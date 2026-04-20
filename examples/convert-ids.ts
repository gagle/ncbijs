// Convert well-known PMIDs to PMCIDs and DOIs. Print the mapping table.

import { convert } from '@ncbijs/id-converter';

async function main(): Promise<void> {
  const pmids = ['23193287', '29083299', '30846697'];

  const results = await convert(pmids, {
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  console.log('PMID → PMCID → DOI\n');

  for (const entry of results) {
    const pmid = entry.pmid ?? '—';
    const pmcid = entry.pmcid ?? '—';
    const doi = entry.doi ?? '—';
    console.log(`  ${pmid}  →  ${pmcid}  →  ${doi}`);
  }
}

main().catch(console.error);
