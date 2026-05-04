import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';
import { PubChem } from '@ncbijs/pubchem';

const DB_PATH = resolve(import.meta.dirname, '../../demo/public/data/ncbijs.duckdb');

let storage: DuckDbFileStorage;
let pubchem: PubChem;

beforeAll(async () => {
  storage = await DuckDbFileStorage.open(DB_PATH);
  pubchem = PubChem.fromStorage({
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

describe('PubChem.fromStorage() E2E', () => {
  it('retrieves aspirin (CID 2244)', async () => {
    const compound = await pubchem.compoundByCid(2244);
    expect(compound.cid).toBe(2244);
    expect(compound.iupacName).toBeTruthy();
    expect(compound.canonicalSmiles).toBeTruthy();
  });

  it('retrieves caffeine (CID 2519)', async () => {
    const compound = await pubchem.compoundByCid(2519);
    expect(compound.cid).toBe(2519);
  });

  it('throws for non-existent CID', async () => {
    await expect(pubchem.compoundByCid(999999999)).rejects.toThrow();
  });
});
