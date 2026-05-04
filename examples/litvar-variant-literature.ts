// Find literature linked to genetic variants using LitVar2.
// Look up variant details and retrieve publication IDs by rsID.

import { LitVar } from '@ncbijs/litvar';

async function main(): Promise<void> {
  const litvar = new LitVar();
  const rsid = 'rs328';

  console.log(`Looking up variant ${rsid}...\n`);

  const info = await litvar.variant(rsid);
  console.log(`  rsID: ${info.rsid}`);
  console.log(`  Gene: ${info.gene.join(', ')}`);
  console.log(`  Name: ${info.name}`);
  console.log(`  HGVS: ${info.hgvs}`);
  console.log(`  Clinical significance: ${info.clinicalSignificance.join(', ')}`);

  console.log(`\nFetching publications for ${rsid}...\n`);

  const pubs = await litvar.publications(rsid);
  console.log(`  Total publications: ${pubs.count}`);
  console.log(`  First 5 PMIDs: ${pubs.pmids.slice(0, 5).join(', ')}`);
  console.log(`  First 5 PMCIDs: ${pubs.pmcids.slice(0, 5).join(', ')}`);
}

main().catch(console.error);
