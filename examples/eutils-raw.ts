// Low-level ESearch + EFetch round-trip. Search PubMed, fetch XML, and print a snippet.

import { EUtils } from '@ncbijs/eutils';

async function main(): Promise<void> {
  const eutils = new EUtils({
    apiKey: process.env['NCBI_API_KEY'],
    tool: process.env['NCBI_TOOL'] ?? 'ncbijs-example',
    email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  });

  const searchResult = await eutils.esearch({
    db: 'pubmed',
    term: 'single cell RNA sequencing',
    retmax: 3,
  });

  console.log(`Search returned ${searchResult.count} total results`);
  console.log(`First ${searchResult.idList.length} IDs: ${searchResult.idList.join(', ')}\n`);

  if (searchResult.idList.length > 0) {
    const xml = await eutils.efetch({
      db: 'pubmed',
      id: searchResult.idList.join(','),
      retmode: 'xml',
    });

    console.log('--- XML snippet (first 500 chars) ---\n');
    console.log(xml.slice(0, 500));
  }
}

main().catch(console.error);
