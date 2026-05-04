// Query gene data from local DuckDB storage using the same API as NCBI HTTP.
//
// Prerequisites:
//   1. Build sample database: cd demo && pnpm build-data
//   2. Or load data via @ncbijs/etl: await load('genes', storage.createSink('genes'))
//
// Run: pnpm exec tsx examples/storage-query-genes.ts

import { Datasets } from '@ncbijs/datasets';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const DB_PATH = process.argv[2] ?? './demo/public/data/ncbijs.duckdb';

async function main(): Promise<void> {
  const storage = await DuckDbFileStorage.open(DB_PATH);

  const datasets = Datasets.fromStorage({
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

  console.log('Querying genes from local DuckDB storage...\n');

  const genesBySymbol = await datasets.geneBySymbol(['TP53', 'BRCA1'], 'human');
  for (const gene of genesBySymbol) {
    console.log(`${gene.symbol} (Gene ID: ${gene.geneId})`);
    console.log(`  Description: ${gene.description}`);
    console.log(`  Organism: ${gene.taxName}`);
    console.log(`  Chromosomes: ${gene.chromosomes.join(', ')}`);
    console.log();
  }

  console.log('Looking up human taxonomy...\n');

  const taxonomy = await datasets.taxonomy(['Homo sapiens']);
  for (const taxon of taxonomy) {
    console.log(`${taxon.organismName} (Tax ID: ${taxon.taxId})`);
    console.log(`  Rank: ${taxon.rank}`);
    console.log();
  }

  await storage.close();
}

main().catch(console.error);
