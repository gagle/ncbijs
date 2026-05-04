// Query PubChem compound data from local DuckDB storage using the same API as PubChem HTTP.
//
// Prerequisites:
//   1. Build sample database: cd demo && pnpm build-data
//   2. Or load data via @ncbijs/etl: await load('compounds', storage.createSink('compounds'))
//
// Run: pnpm exec tsx examples/storage-query-compound.ts

import { PubChem } from '@ncbijs/pubchem';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const DB_PATH = process.argv[2] ?? './demo/public/data/ncbijs.duckdb';

async function main(): Promise<void> {
  const storage = await DuckDbFileStorage.open(DB_PATH);

  const pubchem = PubChem.fromStorage({
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

  console.log('Querying compounds from local storage...\n');

  const aspirin = await pubchem.compoundByCid(2244);
  console.log(`Aspirin (CID ${aspirin.cid}):`);
  console.log(`  IUPAC: ${aspirin.iupacName}`);
  console.log(`  Formula: ${aspirin.molecularFormula}`);
  console.log(`  Weight: ${aspirin.molecularWeight}`);
  console.log(`  SMILES: ${aspirin.canonicalSmiles}`);
  console.log();

  const caffeine = await pubchem.compoundByCid(2519);
  console.log(`Caffeine (CID ${caffeine.cid}):`);
  console.log(`  IUPAC: ${caffeine.iupacName}`);
  console.log(`  Formula: ${caffeine.molecularFormula}`);
  console.log(`  Weight: ${caffeine.molecularWeight}`);

  await storage.close();
}

main().catch(console.error);
