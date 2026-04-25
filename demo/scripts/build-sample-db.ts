/**
 * Generates small sample Parquet files for the demo's Local Data mode.
 *
 * Usage: pnpm exec tsx demo/scripts/build-sample-db.ts
 *
 * This script uses @ncbijs/etl to download NCBI datasets, then exports
 * them as Parquet files into demo/public/data/ via DuckDB.
 *
 * Requirements:
 * - NCBI_API_KEY env var (recommended for higher rate limits)
 * - @ncbijs/store must be built (uses DuckDbFileStorage)
 * - Internet access to fetch from NCBI FTP
 *
 * Output files:
 * - demo/public/data/mesh.parquet         (~1 MB, all MeSH descriptors)
 * - demo/public/data/clinvar.parquet      (~2 MB, 10K pathogenic variants)
 * - demo/public/data/genes.parquet        (~3 MB, 20K human genes)
 * - demo/public/data/compounds.parquet    (~1 MB, 10K common compounds)
 * - demo/public/data/id-mappings.parquet  (~2 MB, 50K mappings)
 */
import { resolve } from 'node:path';

const DATA_DIR = resolve(import.meta.dirname, '..', 'public', 'data');

console.log('Sample data build script placeholder.');
console.log(`Output directory: ${DATA_DIR}`);
console.log('');
console.log('This script requires internet access to NCBI FTP servers and will');
console.log('download several hundred MB of data to generate small Parquet samples.');
console.log('');
console.log('To generate the data, you will need:');
console.log('  1. @ncbijs/store built (pnpm nx run @ncbijs/store:build)');
console.log('  2. @ncbijs/etl built (pnpm nx run @ncbijs/etl:build)');
console.log('  3. NCBI_API_KEY env var set for higher rate limits');
console.log('');
console.log('Run the full ETL pipeline for each dataset, then export to Parquet:');
console.log('');
console.log('  import { load } from "@ncbijs/etl";');
console.log('  import { DuckDbFileStorage } from "@ncbijs/store";');
console.log('');
console.log('  const storage = await DuckDbFileStorage.open(":memory:");');
console.log('  await load("mesh", storage.createSink("mesh"));');
console.log('  // Then export via: COPY mesh TO "demo/public/data/mesh.parquet"');
