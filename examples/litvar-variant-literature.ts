// Find literature linked to genetic variants using LitVar2.
// Look up variant details and retrieve publications by rsID.

import { publications, variant } from '@ncbijs/litvar';

async function main(): Promise<void> {
  const rsid = 'rs328';

  console.log(`Looking up variant ${rsid}...\n`);

  const info = await variant(rsid);
  console.log(`  rsID: ${info.rsid}`);
  console.log(`  Gene: ${info.gene}`);
  console.log(`  Publications: ${info.publicationCount}`);
  console.log(`  HGVS notations: ${info.hgvs.slice(0, 3).join(', ')}`);

  console.log(`\nFetching publications for ${rsid}...\n`);

  const pubs = await publications(rsid);
  for (const pub of pubs.slice(0, 10)) {
    console.log(`  PMID ${pub.pmid}: ${pub.title.slice(0, 70)}...`);
    console.log(`    ${pub.journal} (${pub.year})`);
  }

  console.log(`\n  Showing ${Math.min(10, pubs.length)} of ${pubs.length} publications`);
}

main().catch(console.error);
