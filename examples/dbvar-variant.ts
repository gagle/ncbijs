// Search dbVar for structural variants and display record details
// including variant accession, organism, placements, and associated genes.

import { DbVar } from '@ncbijs/dbvar';

async function main(): Promise<void> {
  const dbvar = new DbVar({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching dbVar for "BRCA1 deletion"...\n');

  const searchResult = await dbvar.search('BRCA1 deletion', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching variant details...\n');

  const records = await dbvar.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.variantAccession}: ${record.objectType}`);
    console.log(`    Organism: ${record.organism}`);
    for (const placement of record.placements) {
      console.log(
        `    Location: chr${placement.chromosome}:${placement.start}-${placement.end} (${placement.assembly})`,
      );
    }
    if (record.genes.length > 0) {
      console.log(`    Genes: ${record.genes.map((g) => g.name).join(', ')}`);
    }
  }
}

main().catch(console.error);
