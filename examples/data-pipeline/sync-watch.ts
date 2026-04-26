/**
 * Watch NCBI data sources for updates and auto-reload into DuckDB.
 *
 * Usage: pnpm exec tsx examples/data-pipeline/sync-watch.ts [--db-path <path>] [--interval <minutes>] [--dataset <name>]
 *
 * Combines @ncbijs/sync (change detection) with @ncbijs/etl (data loading)
 * to keep a local DuckDB database up to date with upstream NCBI data.
 *
 * Change detection strategy per dataset:
 *   - MD5 checksum (ClinVar, Taxonomy, PubChem): downloads tiny .md5 companion
 *     files (~50 bytes) and compares against stored checksum — reliable content-based detection
 *   - HTTP Last-Modified (Gene, MeSH, PMC IDs): sends HEAD request and compares
 *     the Last-Modified header — universal fallback for datasets without .md5 files
 */

import { join } from 'node:path';
import { listDatasets, load } from '@ncbijs/etl';
import type { EtlDatasetType } from '@ncbijs/etl';
import {
  SyncScheduler,
  HttpTimestampChecker,
  Md5ChecksumChecker,
  InMemorySyncState,
} from '@ncbijs/sync';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

const MD5_URLS: Partial<Record<EtlDatasetType, string>> = {
  clinvar: 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz.md5',
  taxonomy: 'https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/taxdump.tar.gz.md5',
  compounds: 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-SMILES.gz.md5',
};

function createChecker(
  datasetId: EtlDatasetType,
  sourceUrl: string,
): Md5ChecksumChecker | HttpTimestampChecker {
  const md5Url = MD5_URLS[datasetId];

  if (md5Url !== undefined) {
    return new Md5ChecksumChecker(datasetId, md5Url);
  }

  return new HttpTimestampChecker(datasetId, sourceUrl);
}

function parseArgValue(flag: string): string | undefined {
  const flagIndex = process.argv.indexOf(flag);

  if (flagIndex === -1) {
    return undefined;
  }

  return process.argv[flagIndex + 1];
}

async function main(): Promise<void> {
  const dbPath = parseArgValue('--db-path') ?? join(process.cwd(), 'data', 'ncbijs.duckdb');
  const intervalMinutes = Number(parseArgValue('--interval') ?? '60');
  const datasetFilter = parseArgValue('--dataset');

  const allDatasets = listDatasets();
  const datasets =
    datasetFilter !== undefined
      ? allDatasets.filter((info) => info.id === datasetFilter)
      : allDatasets;

  if (datasets.length === 0) {
    const validIds = allDatasets.map((info) => info.id).join(', ');
    console.error(`Unknown dataset: ${datasetFilter ?? '(none)'}. Valid: ${validIds}`);
    process.exit(1);
  }

  const checkers = datasets.map((info) => {
    const sourceUrl = info.sourceUrls[0];

    if (sourceUrl === undefined) {
      throw new Error(`Dataset ${info.id} has no source URLs`);
    }

    return createChecker(info.id, sourceUrl);
  });
  const datasetIds = datasets.map((info) => info.id);

  console.log(`Database: ${dbPath}`);
  console.log(`Check interval: ${String(intervalMinutes)} minutes`);
  console.log(`Watching: ${datasetIds.join(', ')}\n`);

  const storage = await DuckDbFileStorage.open(dbPath);
  const controller = new AbortController();

  const scheduler = new SyncScheduler(new InMemorySyncState(), checkers, {
    checkIntervalMs: intervalMinutes * 60_000,
    datasets: datasetIds,
    signal: controller.signal,
    onUpdate: async (dataset) => {
      console.log(`[sync] ${dataset} has new data, reloading...`);
      const start = Date.now();
      await load(dataset as EtlDatasetType, storage.createSink(dataset as DatasetType));
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[sync] ${dataset} reload complete (${elapsed}s)`);
    },
    onError: (dataset, error) => {
      console.error(`[sync] ${dataset} check failed: ${error.message}`);
    },
  });

  process.on('SIGINT', () => {
    console.log('\n[sync] Shutting down...');
    controller.abort();
    void storage.close().then(() => {
      process.exit(0);
    });
  });

  console.log('[sync] Starting — first check runs immediately\n');
  await scheduler.start();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
