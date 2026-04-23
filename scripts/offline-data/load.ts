/* eslint-disable no-console */
/**
 * Load downloaded NCBI data files into a DuckDB store.
 *
 * Usage: npx tsx scripts/offline-data/load.ts [--input-dir <path>] [--db-path <path>]
 *
 * Reads raw files from data/raw/, parses them with Phase A parsers,
 * and writes records to a DuckDB file via DuckDbFileStorage.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { parseGeneInfoTsv } from '@ncbijs/datasets';
import { parseTaxonomyDump } from '@ncbijs/datasets';
import { parseCompoundExtras } from '@ncbijs/pubchem';
import type { CompoundExtrasInput } from '@ncbijs/pubchem';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

interface LoadStep {
  readonly name: string;
  readonly dataset: DatasetType;
  readonly requiredFiles: ReadonlyArray<string>;
  readonly load: (inputDir: string) => ReadonlyArray<unknown>;
}

const BATCH_SIZE = 10_000;

function readFile(inputDir: string, fileName: string): string {
  const filePath = join(inputDir, fileName);
  return readFileSync(filePath, 'utf-8');
}

const LOAD_STEPS: ReadonlyArray<LoadStep> = [
  {
    name: 'MeSH Descriptors',
    dataset: 'mesh',
    requiredFiles: ['desc2025.xml'],
    load: (inputDir) => {
      const xml = readFile(inputDir, 'desc2025.xml');
      const treeData = parseMeshDescriptorXml(xml);
      return treeData.descriptors;
    },
  },
  {
    name: 'PMC ID Mapping',
    dataset: 'id-mappings',
    requiredFiles: ['PMC-ids.csv'],
    load: (inputDir) => {
      const csv = readFile(inputDir, 'PMC-ids.csv');
      return parsePmcIdsCsv(csv);
    },
  },
  {
    name: 'ClinVar Variants',
    dataset: 'clinvar',
    requiredFiles: ['variant_summary.txt'],
    load: (inputDir) => {
      const tsv = readFile(inputDir, 'variant_summary.txt');
      return parseVariantSummaryTsv(tsv);
    },
  },
  {
    name: 'Gene Info',
    dataset: 'genes',
    requiredFiles: ['gene_info.tsv'],
    load: (inputDir) => {
      const tsv = readFile(inputDir, 'gene_info.tsv');
      return parseGeneInfoTsv(tsv);
    },
  },
  {
    name: 'Taxonomy',
    dataset: 'taxonomy',
    requiredFiles: ['names.dmp', 'nodes.dmp'],
    load: (inputDir) => {
      const namesDmp = readFile(inputDir, 'names.dmp');
      const nodesDmp = readFile(inputDir, 'nodes.dmp');
      return parseTaxonomyDump({ namesDmp, nodesDmp });
    },
  },
  {
    name: 'PubChem Compounds',
    dataset: 'compounds',
    requiredFiles: ['CID-SMILES.tsv', 'CID-InChI-Key.tsv', 'CID-IUPAC.tsv'],
    load: (inputDir) => {
      const input: CompoundExtrasInput = {
        ...(existsSync(join(inputDir, 'CID-SMILES.tsv')) && {
          cidSmiles: readFile(inputDir, 'CID-SMILES.tsv'),
        }),
        ...(existsSync(join(inputDir, 'CID-InChI-Key.tsv')) && {
          cidInchiKey: readFile(inputDir, 'CID-InChI-Key.tsv'),
        }),
        ...(existsSync(join(inputDir, 'CID-IUPAC.tsv')) && {
          cidIupac: readFile(inputDir, 'CID-IUPAC.tsv'),
        }),
      };
      return parseCompoundExtras(input);
    },
  },
];

async function writeBatched(
  storage: DuckDbFileStorage,
  dataset: DatasetType,
  records: ReadonlyArray<unknown>,
): Promise<void> {
  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);
    await storage.writeRecords(dataset, batch);

    const progress = Math.min(offset + BATCH_SIZE, records.length);
    process.stdout.write(
      `\r  [load] ${String(progress).padStart(10)} / ${String(records.length)} records`,
    );
  }

  process.stdout.write('\n');
}

async function main(): Promise<void> {
  const inputDirArg = process.argv.indexOf('--input-dir');
  const inputDir =
    inputDirArg !== -1 && process.argv[inputDirArg + 1] !== undefined
      ? process.argv[inputDirArg + 1]
      : join(process.cwd(), 'data', 'raw');

  const dbPathArg = process.argv.indexOf('--db-path');
  const dbPath =
    dbPathArg !== -1 && process.argv[dbPathArg + 1] !== undefined
      ? process.argv[dbPathArg + 1]
      : join(process.cwd(), 'data', 'ncbijs.duckdb');

  console.log(`Input directory: ${inputDir}`);
  console.log(`Database path:   ${dbPath}\n`);

  const storage = await DuckDbFileStorage.open(dbPath);
  const overallStart = Date.now();

  for (const step of LOAD_STEPS) {
    const missingFiles = step.requiredFiles.filter(
      (fileName) => !existsSync(join(inputDir, fileName)),
    );

    if (missingFiles.length > 0) {
      console.log(`[skip] ${step.name} — missing files: ${missingFiles.join(', ')}`);
      continue;
    }

    console.log(`[parse] ${step.name}...`);
    const parseStart = Date.now();

    let records: ReadonlyArray<unknown>;

    try {
      records = step.load(inputDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  [error] Parse failed: ${message}`);
      continue;
    }

    const parseTime = ((Date.now() - parseStart) / 1000).toFixed(1);
    console.log(`  [parsed] ${String(records.length)} records in ${parseTime}s`);

    const writeStart = Date.now();
    await writeBatched(storage, step.dataset, records);
    const writeTime = ((Date.now() - writeStart) / 1000).toFixed(1);
    console.log(`  [stored] in ${writeTime}s\n`);
  }

  const stats = await storage.getStats();

  console.log('--- Storage Stats ---');

  for (const entry of stats) {
    console.log(`  ${entry.dataset.padEnd(15)} ${String(entry.recordCount).padStart(12)} records`);
  }

  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log(`\nLoad complete in ${overallTime}s`);

  await storage.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
