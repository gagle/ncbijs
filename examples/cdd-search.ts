// Search NCBI CDD for conserved protein domains and display record details
// including accession, title, database, organism, and PSSM length.

import { Cdd } from '@ncbijs/cdd';

async function main(): Promise<void> {
  const cdd = new Cdd({
    apiKey: process.env['NCBI_API_KEY'],
  });

  console.log('Searching CDD for "zinc finger"...\n');

  const searchResult = await cdd.search('zinc finger', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching domain details...\n');

  const records = await cdd.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.accession}: ${record.title}`);
    console.log(`    Database: ${record.database}`);
    console.log(`    Organism: ${record.organism}`);
    console.log(`    PSSM length: ${record.pssmLength}`);
    if (record.abstract) {
      console.log(`    Description: ${record.abstract.slice(0, 80)}`);
    }
  }
}

main().catch(console.error);
