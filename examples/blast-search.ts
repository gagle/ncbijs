// Submit a BLAST sequence search against NCBI's nucleotide database and display
// the top alignment hits with scores and e-values.

import { Blast } from '@ncbijs/blast';

const QUERY_SEQUENCE = '>test_sequence\nATCGATCGATCGATCGATCGATCGATCG';

async function main(): Promise<void> {
  const blast = new Blast();

  console.log('Submitting BLAST search (blastn vs nt)...\n');

  const submitResult = await blast.submit(QUERY_SEQUENCE, 'blastn', 'nt', {
    hitListSize: 5,
  });
  console.log(`Job submitted: RID ${submitResult.rid}`);
  console.log(`Estimated time: ${submitResult.estimatedSeconds}s\n`);

  console.log('Polling for results...');

  let status = await blast.poll(submitResult.rid);
  while (status.status === 'waiting') {
    console.log('  Still running...');
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    status = await blast.poll(submitResult.rid);
  }

  if (status.status !== 'ready') {
    console.log(`Search ended with status: ${status.status}`);
    return;
  }

  console.log('Results ready!\n');

  const result = await blast.retrieve(submitResult.rid);

  console.log(`Found ${result.hits.length} hits:\n`);
  for (const hit of result.hits.slice(0, 5)) {
    const topHsp = hit.hsps[0];
    if (!topHsp) {
      continue;
    }

    console.log(`  ${hit.accession} (${hit.length} bp)`);
    console.log(`    ${hit.title.slice(0, 80)}...`);
    console.log(`    Score: ${topHsp.bitScore}, E-value: ${topHsp.evalue}`);
    console.log(`    Identity: ${topHsp.identity}/${topHsp.alignLen}\n`);
  }
}

main().catch(console.error);
