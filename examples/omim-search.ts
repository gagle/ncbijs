// Search OMIM for Mendelian genetic disorders and display entry details
// including MIM numbers, type prefixes, and associated gene map loci.

import { Omim } from '@ncbijs/omim';

async function main(): Promise<void> {
  const omim = new Omim({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching OMIM for "Marfan syndrome"...\n');

  const searchResult = await omim.search('Marfan syndrome', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching entry details...\n');

  const entries = await omim.fetch(searchResult.ids);

  for (const entry of entries) {
    const prefix = entry.prefix ? `${entry.prefix}` : '';
    console.log(`  ${prefix}${entry.mimNumber}: ${entry.title}`);
    if (entry.alternativeTitles) {
      console.log(`    Alt: ${entry.alternativeTitles.slice(0, 80)}`);
    }
  }
}

main().catch(console.error);
