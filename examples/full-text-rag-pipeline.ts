// Multi-package workflow: Search PubMed for articles, find those with PMC full text,
// fetch the full text, and chunk it for RAG (Retrieval-Augmented Generation) pipelines.
//
// Packages: @ncbijs/pubmed, @ncbijs/id-converter, @ncbijs/pmc

import { convert } from '@ncbijs/id-converter';
import { PMC, pmcToChunks, pmcToMarkdown } from '@ncbijs/pmc';
import { PubMed } from '@ncbijs/pubmed';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'ncbijs@users.noreply.github.com',
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

async function main(): Promise<void> {
  const pubmed = new PubMed(NCBI_CONFIG);
  const pmc = new PMC(NCBI_CONFIG);

  // 1. Search PubMed for open-access articles
  console.log('1. Searching PubMed for immunotherapy review articles...\n');

  const articles = await pubmed
    .search('cancer immunotherapy checkpoint inhibitors')
    .publicationType('Review')
    .freeFullText()
    .sort('pub_date')
    .limit(5)
    .fetchAll();

  console.log(`   Found ${articles.length} articles\n`);

  // 2. Convert PMIDs to PMCIDs for full-text retrieval
  const pmids = articles.map((a) => a.pmid);
  const convertedIds = await convert(pmids);
  const pmcArticles = convertedIds.filter((entry) => entry.pmcid !== null);

  console.log(`2. ${pmcArticles.length}/${articles.length} have PMC full text\n`);

  if (pmcArticles.length === 0) {
    console.log('   No PMC articles found. Try a broader search.');
    return;
  }

  // 3. Fetch full text and convert to markdown + chunks
  const firstPmcid = pmcArticles[0]!.pmcid!;
  const firstPmid = pmcArticles[0]!.pmid;
  const articleTitle = articles.find((a) => a.pmid === firstPmid)?.title ?? 'Unknown';

  console.log(`3. Fetching full text for ${firstPmcid}...`);
  console.log(`   Title: ${articleTitle.slice(0, 80)}...\n`);

  const fullText = await pmc.fetch(firstPmcid);

  // 4. Convert to markdown (for display)
  const markdown = pmcToMarkdown(fullText);
  console.log(`4. Markdown output (first 500 chars):\n`);
  console.log(`   ${markdown.slice(0, 500).replace(/\n/g, '\n   ')}...\n`);

  // 5. Chunk for RAG pipelines
  const chunks = pmcToChunks(fullText, { maxTokens: 512, overlap: 50 });
  console.log(`5. Semantic chunking for RAG:\n`);
  console.log(`   Total chunks: ${chunks.length}`);
  console.log(`   License: ${fullText.license || 'Not specified'}\n`);

  for (const [index, chunk] of chunks.slice(0, 3).entries()) {
    const preview = chunk.text.slice(0, 100).replace(/\n/g, ' ');
    console.log(`   Chunk ${index + 1} (${chunk.text.length} chars): ${preview}...`);
  }

  if (chunks.length > 3) {
    console.log(`   ... and ${chunks.length - 3} more chunks`);
  }
}

main().catch(console.error);
