// Fetch protein sequences from NCBI in FASTA and GenBank formats,
// demonstrating single and batch retrieval with parsed results.

import { Protein } from '@ncbijs/protein';

async function main(): Promise<void> {
  const protein = new Protein({
    apiKey: process.env['NCBI_API_KEY'],
  });

  console.log('Fetching p53 protein (NP_000537.3) as FASTA...\n');

  const fasta = await protein.fetchFasta('NP_000537.3');
  console.log(`  ID: ${fasta.id}`);
  console.log(`  Description: ${fasta.description}`);
  console.log(`  Length: ${fasta.sequence.length} aa`);
  console.log(`  First 60: ${fasta.sequence.slice(0, 60)}`);

  console.log('\n\nFetching p53 protein (NP_000537) as GenBank...\n');

  const genbank = await protein.fetchGenBank('NP_000537');
  console.log(
    `  Locus: ${genbank.locus.name} (${genbank.locus.length} ${genbank.locus.moleculeType})`,
  );
  console.log(`  Definition: ${genbank.definition}`);
  console.log(`  Organism: ${genbank.organism}`);
  console.log(`  Features: ${genbank.features.length}`);
  for (const feature of genbank.features.slice(0, 3)) {
    console.log(`    ${feature.key} ${feature.location}`);
  }

  console.log('\n\nBatch fetch: NP_000537.3 + NP_009225.1 (FASTA)...\n');

  const batch = await protein.fetchFastaBatch(['NP_000537.3', 'NP_009225.1']);
  for (const record of batch) {
    console.log(`  ${record.id}: ${record.sequence.length} aa`);
  }
}

main().catch(console.error);
