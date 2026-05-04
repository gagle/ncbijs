import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';
import { Datasets } from '@ncbijs/datasets';

const DB_PATH = resolve(import.meta.dirname, '../../demo/public/data/ncbijs.duckdb');

let storage: DuckDbFileStorage;
let datasets: Datasets;

beforeAll(async () => {
  storage = await DuckDbFileStorage.open(DB_PATH);
  datasets = Datasets.fromStorage({
    getRecord: <T>(dataset: string, key: string) =>
      storage.getRecord<T>(dataset as DatasetType, key),
    searchRecords: <T>(
      dataset: string,
      query: {
        readonly field: string;
        readonly value: string;
        readonly operator?: 'eq' | 'contains' | 'starts_with';
        readonly limit?: number;
      },
    ) => storage.searchRecords<T>(dataset as DatasetType, query),
  });
});

afterAll(async () => {
  await storage.close();
});

describe('Datasets.fromStorage() E2E', () => {
  describe('geneById', () => {
    it('retrieves BRCA1 gene by ID', async () => {
      const reports = await datasets.geneById([672]);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.symbol).toBe('BRCA1');
      expect(reports[0]!.geneId).toBe(672);
    });

    it('retrieves TP53 gene by ID', async () => {
      const reports = await datasets.geneById([7157]);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.symbol).toBe('TP53');
    });

    it('returns empty for non-existent gene ID', async () => {
      const reports = await datasets.geneById([999999999]);
      expect(reports).toHaveLength(0);
    });
  });

  describe('geneBySymbol', () => {
    it('retrieves TP53 gene by symbol', async () => {
      const reports = await datasets.geneBySymbol(['TP53'], 'human');
      expect(reports).toHaveLength(1);
      expect(reports[0]!.geneId).toBe(7157);
      expect(reports[0]!.symbol).toBe('TP53');
    });

    it('returns empty for non-existent symbol', async () => {
      const reports = await datasets.geneBySymbol(['NONEXISTENT_GENE'], 'human');
      expect(reports).toHaveLength(0);
    });
  });

  describe('taxonomy', () => {
    it('retrieves Homo sapiens by name', async () => {
      const reports = await datasets.taxonomy(['Homo sapiens']);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0]!.organismName).toBe('Homo sapiens');
    });
  });
});
