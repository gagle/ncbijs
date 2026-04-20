// Fetch a PMC article (PMC3531190) and convert it to markdown. Print the first 500 characters.

import { PMC, pmcToMarkdown } from '@ncbijs/pmc';

async function main(): Promise<void> {
  const pmc = new PMC({
    apiKey: process.env['NCBI_API_KEY'],
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const article = await pmc.fetch('PMC3531190');
  const markdown = pmcToMarkdown(article);

  console.log(`Article: ${article.pmcid}`);
  console.log(`License: ${article.license}`);
  console.log(`Markdown length: ${markdown.length} chars\n`);
  console.log('--- First 500 characters ---\n');
  console.log(markdown.slice(0, 500));
}

main().catch(console.error);
