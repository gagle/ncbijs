// Query MeSH descriptors from local DuckDB storage using the same API as NLM HTTP.
//
// Prerequisites:
//   1. Build sample database: cd demo && pnpm build-data
//   2. Or load data via @ncbijs/etl: await load('mesh', storage.createSink('mesh'))
//
// Run: pnpm exec tsx examples/storage-query-mesh.ts

import { MeSH } from '@ncbijs/mesh';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const DB_PATH = process.argv[2] ?? './demo/public/data/ncbijs.duckdb';

async function main(): Promise<void> {
  const storage = await DuckDbFileStorage.open(DB_PATH);

  const mesh = MeSH.fromStorage({
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

  console.log('Searching MeSH descriptors from local storage...\n');

  const results = await mesh.lookupOnline('Asthma');
  console.log(`Found ${results.length} descriptors matching "Asthma":\n`);

  for (const descriptor of results.slice(0, 10)) {
    console.log(`  ${descriptor.id}: ${descriptor.name}`);
  }

  console.log('\nSearching for "Diabetes"...\n');

  const diabetesResults = await mesh.lookupOnline('Diabetes');
  console.log(`Found ${diabetesResults.length} descriptors matching "Diabetes":\n`);

  for (const descriptor of diabetesResults.slice(0, 10)) {
    console.log(`  ${descriptor.id}: ${descriptor.name}`);
  }

  await storage.close();
}

main().catch(console.error);
