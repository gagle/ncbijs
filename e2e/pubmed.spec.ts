import { describe, expect, it } from 'vitest';
import { PubMed } from '@ncbijs/pubmed';
import { ncbiApiKey } from './test-config';

describe('PubMed E2E', () => {
  const pubmed = new PubMed({
    tool: 'ncbijs-e2e',
    email: 'ncbijs-e2e@test.com',
    apiKey: ncbiApiKey,
  });

  describe('search and fetch', () => {
    it('should search by term and return Article objects', async () => {
      const articles = await pubmed.search('CRISPR').limit(3).fetchAll();

      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBeGreaterThan(0);
      expect(articles.length).toBeLessThanOrEqual(3);

      for (const article of articles) {
        expect(article.pmid).toBeDefined();
        expect(article.pmid).toMatch(/^\d+$/);
        expect(article.title).toBeDefined();
        expect(article.title.length).toBeGreaterThan(0);
      }
    });

    it('should parse article with structured abstract', async () => {
      const articles = await pubmed.search('25891173[pmid]').limit(1).fetchAll();

      expect(articles.length).toBe(1);
      const article = articles[0]!;
      expect(article.pmid).toBe('25891173');
      expect(article.abstract).toBeDefined();
      expect(article.abstract.structured).toBe(true);
      expect(article.abstract.sections).toBeDefined();
      expect(article.abstract.sections!.length).toBeGreaterThan(0);
    });

    it('should parse article with MeSH headings', async () => {
      const articles = await pubmed.search('25891173[pmid]').limit(1).fetchAll();

      expect(articles.length).toBe(1);
      const article = articles[0]!;
      expect(article.mesh).toBeDefined();
      expect(article.mesh).toBeInstanceOf(Array);
      expect(article.mesh.length).toBeGreaterThan(0);

      const firstMesh = article.mesh[0]!;
      expect(firstMesh.descriptor).toBeDefined();
      expect(firstMesh.descriptor.length).toBeGreaterThan(0);
    });
  });

  describe('query builder', () => {
    it('should filter by author', async () => {
      const articles = await pubmed.search('CRISPR').author('Doudna').limit(3).fetchAll();

      expect(articles).toBeInstanceOf(Array);
    });

    it('should filter by journal', async () => {
      const articles = await pubmed.search('genome').journal('Nature').limit(3).fetchAll();

      expect(articles).toBeInstanceOf(Array);
    });

    it('should filter by date range', async () => {
      const articles = await pubmed
        .search('cancer')
        .dateRange('2020/01/01', '2020/12/31')
        .limit(3)
        .fetchAll();

      expect(articles).toBeInstanceOf(Array);
    });

    it('should combine multiple filters', async () => {
      const articles = await pubmed
        .search('genome')
        .author('Collins')
        .dateRange('2015/01/01', '2023/12/31')
        .limit(3)
        .fetchAll();

      expect(articles).toBeInstanceOf(Array);
    });
  });

  describe('related articles', () => {
    it('should call related and return an array', async () => {
      const related = await pubmed.related('33856027');

      expect(related).toBeInstanceOf(Array);
    });
  });

  describe('batches', () => {
    it('should iterate over results in batches', async () => {
      const batchIterator = pubmed.search('asthma').limit(10).batches(5);
      const collectedBatches: Array<ReadonlyArray<unknown>> = [];

      for await (const batch of batchIterator) {
        expect(batch).toBeInstanceOf(Array);
        expect(batch.length).toBeGreaterThan(0);
        expect(batch.length).toBeLessThanOrEqual(5);
        collectedBatches.push(batch);
      }

      expect(collectedBatches.length).toBeGreaterThan(0);
    });
  });
});
