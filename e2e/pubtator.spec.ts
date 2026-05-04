import { describe, expect, it } from 'vitest';
import { PubTator } from '@ncbijs/pubtator';

const pubtator = new PubTator();

describe('PubTator E2E', () => {
  describe('entity search', () => {
    it('should find gene entities by name', async () => {
      const entities = await pubtator.findEntity('BRCA1', 'gene');

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0]).toHaveProperty('id');
      expect(entities[0]).toHaveProperty('name');
      expect(entities[0]).toHaveProperty('type');
    });

    it('should return entity matches with correct type', async () => {
      const entities = await pubtator.findEntity('BRCA1', 'gene');
      const firstMatch = entities[0]!;

      expect(firstMatch.name).toBeDefined();
      expect(firstMatch.id).toBeDefined();
      expect(firstMatch.type).toBe('gene');
    });
  });

  describe('export annotations', () => {
    it('should export BioC annotations for a known PMID', async () => {
      const bioDocument = await pubtator.export(['33856027']);

      expect(bioDocument).toHaveProperty('documents');
      expect(Array.isArray(bioDocument.documents)).toBe(true);
      expect(bioDocument.documents.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should search PubTator3 and return results', async () => {
      const result = await pubtator.search('BRCA1 breast cancer');

      expect(result.total).toBeGreaterThan(0);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('pmid');
      expect(result.results[0]).toHaveProperty('title');
    });
  });
});
