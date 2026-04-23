// Multi-package workflow: Look up gene metadata from NCBI Datasets, search PubMed
// for related literature, and fetch formatted citations. Combines @ncbijs/datasets
// + @ncbijs/pubmed + @ncbijs/cite.

import { Cite } from '@ncbijs/cite';
import type { CSLData } from '@ncbijs/cite';
import { Datasets } from '@ncbijs/datasets';
import { PubMed } from '@ncbijs/pubmed';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

async function main(): Promise<void> {
  const datasets = new Datasets({
    ...('apiKey' in NCBI_CONFIG && { apiKey: NCBI_CONFIG.apiKey }),
  });
  const pubmed = new PubMed(NCBI_CONFIG);
  const citeClient = new Cite();

  console.log('Step 1: Looking up BRCA1 gene metadata...\n');

  const genes = await datasets.geneById([672]);
  const brca1 = genes[0];

  if (!brca1) {
    console.log('Gene not found.');
    return;
  }

  console.log(`  ${brca1.symbol}: ${brca1.description}`);
  console.log(`  Organism: ${brca1.taxName} (${brca1.commonName})`);
  console.log(`  Chromosome: ${brca1.chromosomes.join(', ')}`);
  console.log(`  Transcripts: ${brca1.transcriptCount}, Proteins: ${brca1.proteinCount}`);

  console.log('\nStep 2: Searching PubMed for recent BRCA1 literature...\n');

  const articles = await pubmed
    .search(`${brca1.symbol}[gene] AND cancer`)
    .sort('pub_date')
    .limit(5)
    .fetchAll();

  console.log(`  Found ${articles.length} recent articles:\n`);

  for (const article of articles) {
    console.log(`  PMID ${article.pmid}: ${article.title.slice(0, 80)}...`);
    console.log(`    Journal: ${article.journal.title}, Year: ${article.publicationDate.year}`);
  }

  console.log('\nStep 3: Fetching citations for top articles...\n');

  for (const article of articles.slice(0, 3)) {
    const csl: CSLData = await citeClient.cite(article.pmid, 'csl');
    console.log(`  PMID ${article.pmid}:`);
    console.log(`    ${csl.author.map((author) => author.family).join(', ')}`);
    console.log(`    "${csl.title}"`);
    console.log(`    ${csl['container-title'] ?? 'N/A'}, DOI: ${csl.DOI ?? 'N/A'}\n`);
  }
}

main().catch(console.error);
