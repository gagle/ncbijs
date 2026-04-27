import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';
import { MeSH } from '@ncbijs/mesh';

const DB_PATH = resolve(import.meta.dirname, '../../demo/public/data/ncbijs.duckdb');

let storage: DuckDbFileStorage;
let mesh: MeSH;

beforeAll(async () => {
  storage = await DuckDbFileStorage.open(DB_PATH);
  mesh = MeSH.fromStorage({
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

describe('MeSH.fromStorage() E2E', () => {
  it('finds descriptors matching "Asthma"', async () => {
    const results = await mesh.lookupOnline('Asthma');
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((descriptor) => descriptor.name);
    expect(names.some((name) => name.includes('Asthma'))).toBe(true);
  });

  it('finds descriptors matching "Diabetes"', async () => {
    const results = await mesh.lookupOnline('Diabetes');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty for non-existent term', async () => {
    const results = await mesh.lookupOnline('xyznonexistent123');
    expect(results).toHaveLength(0);
  });
});
