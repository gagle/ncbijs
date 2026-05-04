// Fetch nucleotide sequences from NCBI in FASTA and GenBank formats,
// demonstrating single and batch retrieval with parsed results.

import { Nucleotide } from '@ncbijs/nucleotide';

async function main(): Promise<void> {
  const nucleotide = new Nucleotide({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Fetching BRCA1 mRNA (NM_007294.4) as FASTA...\n');

  const fasta = await nucleotide.fetchFasta('NM_007294.4');
  console.log(`  ID: ${fasta.id}`);
  console.log(`  Description: ${fasta.description}`);
  console.log(`  Length: ${fasta.sequence.length} bp`);
  console.log(`  First 60: ${fasta.sequence.slice(0, 60)}`);

  const gcCount = (fasta.sequence.match(/[GCgc]/g) ?? []).length;
  const gcPercent = ((gcCount / fasta.sequence.length) * 100).toFixed(1);
  console.log(`  GC content: ${gcPercent}%`);

  console.log('\n\nFetching BRCA1 mRNA (NM_007294) as GenBank...\n');

  const genbank = await nucleotide.fetchGenBank('NM_007294');
  console.log(
    `  Locus: ${genbank.locus.name} (${genbank.locus.length} bp, ${genbank.locus.moleculeType})`,
  );
  console.log(`  Definition: ${genbank.definition}`);
  console.log(`  Organism: ${genbank.organism}`);
  console.log(`  Features: ${genbank.features.length}`);
  for (const feature of genbank.features.slice(0, 3)) {
    console.log(`    ${feature.key} ${feature.location}`);
  }

  console.log('\n\nBatch fetch: NM_007294.4 + NM_000546.6 (FASTA)...\n');

  const batch = await nucleotide.fetchFastaBatch(['NM_007294.4', 'NM_000546.6']);
  for (const record of batch) {
    console.log(`  ${record.id}: ${record.sequence.length} bp`);
  }
}

main().catch(console.error);
