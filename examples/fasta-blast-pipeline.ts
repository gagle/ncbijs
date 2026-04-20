// Multi-package workflow: Parse a FASTA sequence, submit it to BLAST, and display
// alignment results. Combines @ncbijs/fasta + @ncbijs/blast.

import { Blast } from '@ncbijs/blast';
import { parseFasta } from '@ncbijs/fasta';

const FASTA_INPUT = `>query_seq Human TP53 exon fragment
ATGGAGGAGCCGCAGTCAGATCCTAGCGTGAGTTTGCCTGAAGGCTGACTGCCTCAGATTCACTTTTAT`;

async function main(): Promise<void> {
  const records = parseFasta(FASTA_INPUT);
  const queryRecord = records[0];

  if (!queryRecord) {
    console.log('No FASTA records found.');
    return;
  }

  console.log(`Parsed query sequence: ${queryRecord.id}`);
  console.log(`  Description: ${queryRecord.description}`);
  console.log(`  Length: ${queryRecord.sequence.length} bp\n`);

  const blast = new Blast();

  console.log('Submitting to BLAST (megablast vs nt)...\n');

  const result = await blast.search(FASTA_INPUT, 'megablast', 'nt', {
    hitListSize: 5,
    expect: 0.001,
  });

  console.log(`BLAST returned ${result.hits.length} hits:\n`);

  for (const hit of result.hits) {
    const topHsp = hit.hsps[0];
    if (!topHsp) {
      continue;
    }

    console.log(`  ${hit.accession} — ${hit.title.slice(0, 70)}`);
    console.log(`    Length: ${hit.length}, Score: ${topHsp.bitScore}, E-value: ${topHsp.evalue}`);
    console.log(`    Identity: ${topHsp.identity}/${topHsp.alignLen}, Gaps: ${topHsp.gaps}\n`);
  }
}

main().catch(console.error);
