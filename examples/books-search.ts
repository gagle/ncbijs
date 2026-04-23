// Search NCBI Books for bookshelf entries and display record details
// including title, accession ID, book name, and resource type.

import { Books } from '@ncbijs/books';

async function main(): Promise<void> {
  const books = new Books({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching NCBI Books for "genetics"...\n');

  const searchResult = await books.search('genetics', { retmax: 5 });
  console.log(`  Total results: ${searchResult.total}`);
  console.log(`  IDs returned: ${searchResult.ids.length}`);

  if (searchResult.ids.length === 0) {
    return;
  }

  console.log('\nFetching book details...\n');

  const records = await books.fetch(searchResult.ids);

  for (const record of records) {
    console.log(`  ${record.accessionId}: ${record.title}`);
    console.log(`    Book: ${record.bookName}`);
    console.log(`    Type: ${record.resourceType}`);
    console.log(`    Date: ${record.publicationDate}`);
  }
}

main().catch(console.error);
