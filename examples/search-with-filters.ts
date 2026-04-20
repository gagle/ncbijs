// Use PubMedQueryBuilder to search with filters: author, date range, and free full text.

import { PubMed } from '@ncbijs/pubmed';

async function main(): Promise<void> {
  const pubmed = new PubMed({
    apiKey: process.env['NCBI_API_KEY'],
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const articles = await pubmed
    .search('machine learning drug discovery')
    .author('Zhang Y')
    .dateRange('2022/01/01', '2024/12/31')
    .freeFullText()
    .sort('pub_date')
    .limit(5)
    .fetchAll();

  console.log(`Found ${articles.length} articles:\n`);

  for (const article of articles) {
    const year = article.publicationDate.year;
    const journal = article.journal.isoAbbrev;
    console.log(`  [${year}] ${article.title}`);
    console.log(`    PMID: ${article.pmid} | Journal: ${journal}\n`);
  }
}

main().catch(console.error);
