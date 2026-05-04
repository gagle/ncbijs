// Search PubMed for "CRISPR gene therapy" and print the top 5 article titles with PMIDs.

import { PubMed } from '@ncbijs/pubmed';

async function main(): Promise<void> {
  const pubmed = new PubMed({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const articles = await pubmed.search('CRISPR gene therapy').sort('relevance').limit(5).fetchAll();

  console.log(`Found ${articles.length} articles:\n`);

  for (const article of articles) {
    console.log(`  PMID ${article.pmid}: ${article.title}`);
  }
}

main().catch(console.error);
