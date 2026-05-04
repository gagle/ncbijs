// Search SRA for sequencing experiments and display experiment details
// including accession, organism, platform, library info, and run statistics.

import { Sra } from '@ncbijs/sra';

async function main(): Promise<void> {
  const sra = new Sra({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching SRA for "Homo sapiens RNA-seq"...\n');

  const searchResult = await sra.search('Homo sapiens RNA-seq', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching experiment details...\n');

  const experiments = await sra.fetch(searchResult.ids);

  for (const experiment of experiments) {
    console.log(`  ${experiment.experimentAccession}: ${experiment.title}`);
    console.log(`    Organism: ${experiment.organism.scientificName}`);
    console.log(`    Platform: ${experiment.platform} (${experiment.instrumentModel})`);
    console.log(`    Library: ${experiment.libraryStrategy} / ${experiment.libraryLayout}`);
    for (const run of experiment.runs) {
      console.log(`    Run ${run.accession}: ${run.totalSpots} spots, ${run.totalBases} bases`);
    }
  }
}

main().catch(console.error);
