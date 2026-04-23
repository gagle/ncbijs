import { describe, expect, it } from 'vitest';
import { EUtils } from '@ncbijs/eutils';
import { ncbiApiKey } from './test-config';

describe('E-utilities E2E', () => {
  const eutils = new EUtils({
    tool: 'ncbijs-e2e',
    email: 'ncbijs-e2e@test.com',
    apiKey: ncbiApiKey,
  });

  describe('ESearch + EFetch round-trip', () => {
    it('should search PubMed and fetch results', async () => {
      const result = await eutils.esearch({
        db: 'pubmed',
        term: 'human genome',
        retmax: 5,
      });

      expect(result.count).toBeGreaterThan(0);
      expect(result.idList.length).toBeGreaterThan(0);
    });

    it('should return valid PMIDs from search', async () => {
      const result = await eutils.esearch({
        db: 'pubmed',
        term: 'human genome',
        retmax: 3,
      });

      for (const pmid of result.idList) {
        expect(pmid).toMatch(/^\d+$/);
      }
    });

    it('should fetch XML for returned PMIDs', async () => {
      const searchResult = await eutils.esearch({
        db: 'pubmed',
        term: 'human genome',
        retmax: 1,
      });

      const xml = await eutils.efetch({
        db: 'pubmed',
        id: searchResult.idList[0],
        retmode: 'xml',
      });

      expect(xml).toBeDefined();
      expect(xml.length).toBeGreaterThan(0);
      expect(xml).toContain('<PubmedArticle');
    });
  });

  describe('ESummary', () => {
    it('should return document summaries for known PMIDs', async () => {
      const result = await eutils.esummary({
        db: 'pubmed',
        id: '17284678',
      });

      expect(result.docSums).toBeDefined();
      expect(result.docSums.length).toBeGreaterThan(0);
      expect(result.docSums[0]?.uid).toBe('17284678');
    });
  });

  describe('EInfo', () => {
    it('should return database list when no db specified', async () => {
      const result = await eutils.einfo();

      expect(result.dbList).toBeDefined();
      expect(result.dbList).toBeInstanceOf(Array);
      expect(result.dbList).toContain('pubmed');
    });

    it('should return field info for pubmed db', async () => {
      const result = await eutils.einfo({ db: 'pubmed' });

      expect(result.dbInfo).toBeDefined();
      expect(result.dbInfo?.fieldList).toBeDefined();
      expect(result.dbInfo!.fieldList.length).toBeGreaterThan(0);
      expect(result.dbInfo?.dbName).toBe('pubmed');
    });
  });

  describe('ELink', () => {
    it('should return a valid linkSets response', async () => {
      const result = await eutils.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '33856027',
        cmd: 'neighbor',
      });

      expect(result.linkSets).toBeDefined();
      expect(result.linkSets).toBeInstanceOf(Array);
    });
  });

  describe('History Server', () => {
    it('should use WebEnv from ESearch in subsequent EFetch', async () => {
      const searchResult = await eutils.esearch({
        db: 'pubmed',
        term: 'human genome',
        usehistory: 'y',
        retmax: 3,
      });

      expect(searchResult.webEnv).toBeDefined();
      expect(searchResult.queryKey).toBeDefined();

      const xml = await eutils.efetch({
        db: 'pubmed',
        WebEnv: searchResult.webEnv,
        query_key: searchResult.queryKey,
        retmax: 2,
        retmode: 'xml',
      });

      expect(xml).toBeDefined();
      expect(xml.length).toBeGreaterThan(0);
      expect(xml).toContain('<PubmedArticle');
    });
  });

  describe('rate limiting', () => {
    it('should complete multiple requests without 429 errors', async () => {
      const requests = Array.from({ length: 5 }, (_, index) =>
        eutils.esearch({
          db: 'pubmed',
          term: `test query ${index}`,
          retmax: 1,
        }),
      );

      const results = await Promise.all(requests);

      for (const result of results) {
        expect(result.count).toBeDefined();
      }
    });
  });
});
