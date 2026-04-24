/**
 * Load downloaded NCBI data files into a DuckDB store via the pipeline API.
 *
 * Usage: npx tsx examples/data-pipeline/load.ts [--input-dir <path>] [--db-path <path>]
 *
 * Reads raw files from data/raw/, parses them with bulk parsers through
 * @ncbijs/pipeline, and writes records to DuckDB via DuckDbSink.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { parseGeneInfoTsv, parseTaxonomyDump } from '@ncbijs/datasets';
import { parseCompoundExtras } from '@ncbijs/pubchem';
import type { CompoundExtrasInput } from '@ncbijs/pubchem';
import { pipeline, createFileSource, createCompositeSource } from '@ncbijs/pipeline';
import type { Source } from '@ncbijs/pipeline';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

interface PipelineStep {
  readonly name: string;
  readonly dataset: DatasetType;
  readonly requiredFiles: ReadonlyArray<string>;
  readonly source: (inputDir: string) => Source<string> | Source<Record<string, string>>;
  readonly parse: (raw: string | Record<string, string>) => ReadonlyArray<unknown>;
}

const PIPELINE_STEPS: ReadonlyArray<PipelineStep> = [
  {
    name: 'MeSH Descriptors',
    dataset: 'mesh',
    requiredFiles: ['desc2025.xml'],
    source: (inputDir) => createFileSource(join(inputDir, 'desc2025.xml')),
    parse: (raw) => parseMeshDescriptorXml(raw as string).descriptors,
  },
  {
    name: 'PMC ID Mapping',
    dataset: 'id-mappings',
    requiredFiles: ['PMC-ids.csv'],
    source: (inputDir) => createFileSource(join(inputDir, 'PMC-ids.csv')),
    parse: (raw) => parsePmcIdsCsv(raw as string),
  },
  {
    name: 'ClinVar Variants',
    dataset: 'clinvar',
    requiredFiles: ['variant_summary.txt'],
    source: (inputDir) => createFileSource(join(inputDir, 'variant_summary.txt')),
    parse: (raw) => parseVariantSummaryTsv(raw as string),
  },
  {
    name: 'Gene Info',
    dataset: 'genes',
    requiredFiles: ['gene_info.tsv'],
    source: (inputDir) => createFileSource(join(inputDir, 'gene_info.tsv')),
    parse: (raw) => parseGeneInfoTsv(raw as string),
  },
  {
    name: 'Taxonomy',
    dataset: 'taxonomy',
    requiredFiles: ['names.dmp', 'nodes.dmp'],
    source: (inputDir) =>
      createCompositeSource({
        namesDmp: createFileSource(join(inputDir, 'names.dmp')),
        nodesDmp: createFileSource(join(inputDir, 'nodes.dmp')),
      }),
    parse: (raw) => {
      const composite = raw as Record<string, string>;
      return parseTaxonomyDump({
        namesDmp: composite['namesDmp'] ?? '',
        nodesDmp: composite['nodesDmp'] ?? '',
      });
    },
  },
  {
    name: 'PubChem Compounds',
    dataset: 'compounds',
    requiredFiles: ['CID-SMILES.tsv', 'CID-InChI-Key.tsv', 'CID-IUPAC.tsv'],
    source: (inputDir) =>
      createCompositeSource({
        cidSmiles: createFileSource(join(inputDir, 'CID-SMILES.tsv')),
        cidInchiKey: createFileSource(join(inputDir, 'CID-InChI-Key.tsv')),
        cidIupac: createFileSource(join(inputDir, 'CID-IUPAC.tsv')),
      }),
    parse: (raw) => {
      const composite = raw as Record<string, string>;
      const input: CompoundExtrasInput = {
        cidSmiles: composite['cidSmiles'] ?? '',
        cidInchiKey: composite['cidInchiKey'] ?? '',
        cidIupac: composite['cidIupac'] ?? '',
      };
      return parseCompoundExtras(input);
    },
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
  const inputDir = parseArgValue('--input-dir') ?? join(process.cwd(), 'data', 'raw');
  const dbPath = parseArgValue('--db-path') ?? join(process.cwd(), 'data', 'ncbijs.duckdb');

  console.log(`Input directory: ${inputDir}`);
  console.log(`Database path:   ${dbPath}\n`);

  const storage = await DuckDbFileStorage.open(dbPath);
  const overallStart = Date.now();

  for (const step of PIPELINE_STEPS) {
    const missingFiles = step.requiredFiles.filter(
      (fileName) => !existsSync(join(inputDir, fileName)),
    );

    if (missingFiles.length > 0) {
      console.log(`[skip] ${step.name} — missing files: ${missingFiles.join(', ')}`);
      continue;
    }

    console.log(`[pipeline] ${step.name}...`);
    const start = Date.now();

    try {
      const result = await pipeline(
        step.source(inputDir) as Source<string>,
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
  console.log(`\nLoad complete in ${overallTime}s`);

  await storage.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
