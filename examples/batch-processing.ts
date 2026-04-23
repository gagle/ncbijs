// Use PubMedQueryBuilder.batches() to process results in streaming fashion. Print batch sizes.

import { PubMed } from '@ncbijs/pubmed';

async function main(): Promise<void> {
  const pubmed = new PubMed({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const query = pubmed
    .search('microbiome gut brain axis')
    .dateRange('2023/01/01', '2024/12/31')
    .freeFullText()
    .limit(50);

  console.log(`Query: ${query.buildQuery()}\n`);

  let batchNumber = 0;
  let totalArticles = 0;

  for await (const batch of query.batches(10)) {
    batchNumber++;
    totalArticles += batch.length;
    const firstTitle = batch[0]?.title ?? '(empty)';
    console.log(`Batch ${batchNumber}: ${batch.length} articles — first: "${firstTitle}"`);
  }

  console.log(`\nProcessed ${totalArticles} articles in ${batchNumber} batches`);
}

main().catch(console.error);
