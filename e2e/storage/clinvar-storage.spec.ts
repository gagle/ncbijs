import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';
import { ClinVar } from '@ncbijs/clinvar';

const DB_PATH = resolve(import.meta.dirname, '../../demo/public/data/ncbijs.duckdb');

let storage: DuckDbFileStorage;
let clinvar: ClinVar;

beforeAll(async () => {
  storage = await DuckDbFileStorage.open(DB_PATH);
  clinvar = ClinVar.fromStorage({
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

describe('ClinVar.fromStorage() E2E', () => {
  it('finds variants for BRCA1', async () => {
    const results = await clinvar.searchAndFetch('BRCA1');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.uid).toBeTruthy();
  });

  it('finds variants for TP53', async () => {
    const results = await clinvar.searchAndFetch('TP53');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty for non-existent term', async () => {
    const results = await clinvar.searchAndFetch('xyznonexistent123');
    expect(results).toHaveLength(0);
  });
});
