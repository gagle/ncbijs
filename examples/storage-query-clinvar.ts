// Query ClinVar variants from local DuckDB storage using the same API as NCBI HTTP.
//
// Prerequisites:
//   1. Build sample database: cd demo && pnpm build-data
//   2. Or load data via @ncbijs/etl: await load('clinvar', storage.createSink('clinvar'))
//
// Run: pnpm exec tsx examples/storage-query-clinvar.ts

import { ClinVar } from '@ncbijs/clinvar';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const DB_PATH = process.argv[2] ?? './demo/public/data/ncbijs.duckdb';

async function main(): Promise<void> {
  const storage = await DuckDbFileStorage.open(DB_PATH);

  const clinvar = ClinVar.fromStorage({
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

  console.log('Searching ClinVar variants from local storage...\n');

  const brca1Variants = await clinvar.searchAndFetch('BRCA1');
  console.log(`Found ${brca1Variants.length} BRCA1 variants:\n`);

  for (const variant of brca1Variants.slice(0, 5)) {
    console.log(`  ${variant.uid}: ${variant.title}`);
    console.log(`    Significance: ${variant.clinicalSignificance}`);
    if (variant.genes.length > 0) {
      console.log(`    Genes: ${variant.genes.map((gene) => gene.symbol).join(', ')}`);
    }
    console.log();
  }

  await storage.close();
}

main().catch(console.error);
