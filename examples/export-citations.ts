// Generate APA and BibTeX citations for 2 PMIDs. Print them.

import { cite } from '@ncbijs/cite';

async function main(): Promise<void> {
  const pmids = ['23193287', '29083299'];

  for (const pmid of pmids) {
    const apa = await cite(pmid, 'apa');
    const bibtex = await cite(pmid, 'bibtex');

    console.log(`--- PMID ${pmid} ---\n`);
    console.log('APA:');
    console.log(`  ${apa.trim()}\n`);
    console.log('BibTeX:');
    console.log(`  ${bibtex.trim()}\n`);
  }
}

main().catch(console.error);
