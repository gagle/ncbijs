// Search NCBI Structure for macromolecular 3D structures and display record details
// including PDB accession, description, resolution, and experimental method.

import { Structure } from '@ncbijs/structure';

async function main(): Promise<void> {
  const structure = new Structure({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching Structure for "p53"...\n');

  const searchResult = await structure.search('p53', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching structure details...\n');

  const records = await structure.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.pdbAccession}: ${record.description}`);
    console.log(`    Method: ${record.experimentalMethod}`);
    if (record.resolution) {
      console.log(`    Resolution: ${record.resolution} Å`);
    }
    console.log(`    Organisms: ${record.organisms.join(', ')}`);
  }
}

main().catch(console.error);
