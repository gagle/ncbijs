// Search GEO for gene expression datasets and display record details
// including accession, title, taxon, samples, and PubMed links.

import { Geo } from '@ncbijs/geo';

async function main(): Promise<void> {
  const geo = new Geo({
    apiKey: process.env['NCBI_API_KEY'],
  });

  console.log('Searching GEO for "breast cancer RNA-seq"...\n');

  const searchResult = await geo.search('breast cancer RNA-seq', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching dataset details...\n');

  const records = await geo.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.accession}: ${record.title}`);
    console.log(`    Taxon: ${record.taxon}`);
    console.log(`    Samples: ${record.sampleCount}`);
    if (record.pubmedIds.length > 0) {
      console.log(`    PubMed IDs: ${record.pubmedIds.join(', ')}`);
    }
  }
}

main().catch(console.error);
