// Fetch a PMC article and chunk it for RAG pipelines. Print chunk count and first chunk.

import { PMC, pmcToChunks } from '@ncbijs/pmc';

async function main(): Promise<void> {
  const pmc = new PMC({
    apiKey: process.env['NCBI_API_KEY'],
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const article = await pmc.fetch('PMC3531190');
  const chunks = pmcToChunks(article, { maxTokens: 512, overlap: 50 });

  console.log(`Article: ${article.pmcid}`);
  console.log(`Total chunks: ${chunks.length}\n`);

  if (chunks.length > 0) {
    const firstChunk = chunks[0]!;
    console.log('--- First chunk ---');
    console.log(`Section: ${firstChunk.section}`);
    console.log(`Tokens: ${firstChunk.tokenCount} | Length: ${firstChunk.text.length} chars\n`);
    console.log(firstChunk.text);
  }
}

main().catch(console.error);
