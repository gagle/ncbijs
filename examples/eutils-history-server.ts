// Use the History Server pipeline methods to search PubMed and stream results
// in batches. Demonstrates searchAndFetch and searchAndSummarize.

import { EUtils } from '@ncbijs/eutils';

async function main(): Promise<void> {
  const eutils = new EUtils({
    tool: 'ncbijs-example',
    email: 'example@university.edu',
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('searchAndFetch: streaming PubMed abstracts...\n');

  let batchCount = 0;
  for await (const batch of eutils.searchAndFetch({
    db: 'pubmed',
    term: 'CRISPR gene therapy 2024',
    rettype: 'abstract',
    retmode: 'xml',
    batchSize: 100,
  })) {
    batchCount++;
    console.log(`  Batch ${batchCount}: ${batch.length} characters`);
    if (batchCount >= 3) {
      console.log('  (stopping after 3 batches for demo)');
      break;
    }
  }

  console.log('\nsearchAndSummarize: streaming DocSums...\n');

  let summaryBatch = 0;
  for await (const result of eutils.searchAndSummarize({
    db: 'pubmed',
    term: 'mRNA vaccine',
    retmode: 'json',
    batchSize: 5,
  })) {
    summaryBatch++;
    console.log(`  Batch ${summaryBatch}: ${result.docSums.length} summaries`);
    for (const docSum of result.docSums) {
      console.log(`    UID ${docSum.uid}`);
    }
    if (summaryBatch >= 2) {
      console.log('  (stopping after 2 batches for demo)');
      break;
    }
  }
}

main().catch(console.error);
