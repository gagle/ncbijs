import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';
import { createConverter } from '@ncbijs/id-converter';
import type { ConvertedId } from '@ncbijs/id-converter';

const DB_PATH = resolve(import.meta.dirname, '../../demo/public/data/ncbijs.duckdb');

let storage: DuckDbFileStorage;
let convertIds: (ids: ReadonlyArray<string>) => Promise<ReadonlyArray<ConvertedId>>;

beforeAll(async () => {
  storage = await DuckDbFileStorage.open(DB_PATH);
  convertIds = createConverter({
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

describe('createConverter(storage) E2E', () => {
  it('converts PMID 35296856', async () => {
    const results = await convertIds(['35296856']);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.pmid).toBe('35296856');
  });

  it('returns empty for non-existent PMID', async () => {
    const results = await convertIds(['999999999']);
    expect(results).toHaveLength(0);
  });
});
