// Convert article IDs from local DuckDB storage using the same API as NCBI HTTP.
//
// Prerequisites:
//   1. Build sample database: cd demo && pnpm build-data
//   2. Or load data via @ncbijs/etl: await load('id-mappings', storage.createSink('id-mappings'))
//
// Run: pnpm exec tsx examples/storage-convert-ids.ts

import { createConverter } from '@ncbijs/id-converter';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const DB_PATH = process.argv[2] ?? './demo/public/data/ncbijs.duckdb';

async function main(): Promise<void> {
  const storage = await DuckDbFileStorage.open(DB_PATH);

  const convertIds = createConverter({
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

  console.log('Converting article IDs from local storage...\n');

  const results = await convertIds(['35296856']);

  for (const result of results) {
    console.log(`PMID: ${result.pmid}`);
    console.log(`  PMCID: ${result.pmcid ?? 'N/A'}`);
    console.log(`  DOI: ${result.doi ?? 'N/A'}`);
    console.log();
  }

  await storage.close();
}

main().catch(console.error);
