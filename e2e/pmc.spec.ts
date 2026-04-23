import { describe, expect, it } from 'vitest';
import { PMC, pmcToChunks, pmcToMarkdown, pmcToPlainText } from '@ncbijs/pmc';
import type { FullTextArticle } from '@ncbijs/pmc';
import { ncbiApiKey } from './test-config';

describe('PMC E2E', () => {
  const pmc = new PMC({
    tool: 'ncbijs-e2e',
    email: 'ncbijs-e2e@test.com',
    apiKey: ncbiApiKey,
  });

  let article: FullTextArticle;

  it('fetches the article for subsequent tests', async () => {
    article = await pmc.fetch('PMC3531190');
  });

  describe('fetch full text', () => {
    it('should fetch a known open-access article by PMCID', () => {
      expect(article).toBeDefined();
      expect(article.pmcid).toBe('PMC3531190');
    });

    it('should return FullTextArticle with front, body, back', () => {
      expect(article.front).toBeDefined();
      expect(article.body).toBeDefined();
      expect(article.back).toBeDefined();

      expect(article.front.article).toBeDefined();
      expect(article.front.article.title).toBeDefined();
      expect(article.front.article.title.length).toBeGreaterThan(0);
      expect(article.front.article.authors).toBeInstanceOf(Array);
      expect(article.front.article.authors.length).toBeGreaterThan(0);

      expect(article.body).toBeInstanceOf(Array);
      expect(article.body.length).toBeGreaterThan(0);
    });

    it('should convert to markdown', () => {
      const markdown = pmcToMarkdown(article);

      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(0);
      expect(typeof markdown).toBe('string');
    });

    it('should convert to plain text', () => {
      const plainText = pmcToPlainText(article);

      expect(plainText).toBeDefined();
      expect(plainText.length).toBeGreaterThan(0);
      expect(typeof plainText).toBe('string');
    });

    it('should convert to chunks', () => {
      const chunks = pmcToChunks(article);

      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(0);

      const firstChunk = chunks[0]!;
      expect(firstChunk.text).toBeDefined();
      expect(firstChunk.text.length).toBeGreaterThan(0);
      expect(firstChunk.section).toBeDefined();
      expect(typeof firstChunk.tokenCount).toBe('number');
    });
  });

  describe('OA Service', () => {
    it('should look up a known OA article', async () => {
      const record = await pmc.oa.lookup('PMC3531190');

      expect(record).toBeDefined();
      expect(record.pmcid).toBe('PMC3531190');
      expect(record.xmlUrl).toBeTruthy();
    });

    it('should return download URLs', async () => {
      const record = await pmc.oa.lookup('PMC3531190');

      expect(record.xmlUrl).toBeTruthy();
      expect(record.textUrl).toBeTruthy();
    });
  });
});
