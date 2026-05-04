/**
 * Stream NCBI bulk data directly from HTTP into DuckDB — no disk download step.
 *
 * Usage: pnpm exec tsx examples/data-pipeline/http-to-duckdb.ts [--db-path <path>] [--dataset <name>]
 *
 * Demonstrates the pipeline's HTTP source: fetch from NCBI FTP, auto-decompress
 * gzip, parse with bulk parsers, and write to DuckDB in a single pipeline call.
 */

import { join } from 'node:path';
import { pipeline, createHttpSource } from '@ncbijs/pipeline';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';
import { parseGeneInfoTsv } from '@ncbijs/datasets';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

interface HttpPipelineStep {
  readonly name: string;
  readonly dataset: DatasetType;
  readonly url: string;
  readonly parse: (raw: string) => ReadonlyArray<unknown>;
}

const STEPS: ReadonlyArray<HttpPipelineStep> = [
  {
    name: 'ClinVar Variants',
    dataset: 'clinvar',
    url: 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz',
    parse: (tsv) => parseVariantSummaryTsv(tsv),
  },
  {
    name: 'PMC ID Mappings',
    dataset: 'id-mappings',
    url: 'https://ftp.ncbi.nlm.nih.gov/pub/pmc/PMC-ids.csv.gz',
    parse: (csv) => parsePmcIdsCsv(csv),
  },
  {
    name: 'Gene Info',
    dataset: 'genes',
    url: 'https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz',
    parse: (tsv) => parseGeneInfoTsv(tsv),
  },
];

function parseArgValue(flag: string): string | undefined {
  const flagIndex = process.argv.indexOf(flag);

  if (flagIndex === -1) {
    return undefined;
  }

  return process.argv[flagIndex + 1];
}

async function main(): Promise<void> {
  const dbPath = parseArgValue('--db-path') ?? join(process.cwd(), 'data', 'ncbijs.duckdb');
  const datasetFilter = parseArgValue('--dataset');

  const steps =
    datasetFilter !== undefined ? STEPS.filter((step) => step.dataset === datasetFilter) : STEPS;

  if (steps.length === 0) {
    const validNames = STEPS.map((step) => step.dataset).join(', ');
    console.error(`Unknown dataset: ${datasetFilter ?? '(none)'}. Valid: ${validNames}`);
    process.exit(1);
  }

  console.log(`Database path: ${dbPath}\n`);

  const storage = await DuckDbFileStorage.open(dbPath);
  const overallStart = Date.now();

  for (const step of steps) {
    console.log(`[http] ${step.name}`);
    console.log(`  URL: ${step.url}`);
    const start = Date.now();

    try {
      const result = await pipeline(
        createHttpSource(step.url),
        step.parse as (raw: string) => ReadonlyArray<Record<string, unknown>>,
        storage.createSink(step.dataset),
        {
          onProgress: (event) => {
            process.stdout.write(
              `\r  [load] ${String(event.recordsProcessed).padStart(10)} records, ` +
                `${String(event.batchesWritten)} batches`,
            );
          },
        },
      );

      process.stdout.write('\n');
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `  [done] ${String(result.recordsProcessed)} records in ` +
          `${String(result.batchesWritten)} batches (${elapsed}s)\n`,
      );
    } catch (error) {
      process.stdout.write('\n');
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  [error] ${message}\n`);
    }
  }

  const stats = await storage.getStats();

  console.log('--- Storage Stats ---');

  for (const entry of stats) {
    console.log(`  ${entry.dataset.padEnd(15)} ${String(entry.recordCount).padStart(12)} records`);
  }

  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log(`\nHTTP-to-DuckDB complete in ${overallTime}s`);

  await storage.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
