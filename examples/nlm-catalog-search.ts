// Search NLM Catalog for journal and serial records and display details
// including title, ISSN, country, and Medline abbreviation.

import { NlmCatalog } from '@ncbijs/nlm-catalog';

async function main(): Promise<void> {
  const nlmCatalog = new NlmCatalog({
    apiKey: process.env['NCBI_API_KEY'],
  });

  console.log('Searching NLM Catalog for "genetics journal"...\n');

  const searchResult = await nlmCatalog.search('genetics journal', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching catalog details...\n');

  const records = await nlmCatalog.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.title}`);
    console.log(`    Medline: ${record.medlineAbbreviation}`);
    console.log(`    Country: ${record.country}`);
    if (record.issns.length > 0) {
      console.log(`    ISSN: ${record.issns.map((i) => `${i.issn} (${i.type})`).join(', ')}`);
    }
  }
}

main().catch(console.error);
