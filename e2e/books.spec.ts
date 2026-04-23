import { describe, expect, it } from 'vitest';
import { Books } from '@ncbijs/books';
import { ncbiApiKey } from './test-config';

const books = new Books({
  apiKey: ncbiApiKey,
});

describe('Books E2E', () => {
  it('should search for bookshelf entries', async () => {
    const searchResult = await books.search('genetics', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch book details by UID', async () => {
    const searchResult = await books.search('cancer treatment', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const records = await books.fetch(searchResult.ids);

    expect(records).toHaveLength(1);
    expect(records[0]!.uid).toBeTruthy();
    expect(records[0]!.title).toBeTruthy();
  });
});
