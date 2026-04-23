/**
 * Verify a DuckDB store by running spot-check queries per dataset.
 *
 * Usage: npx tsx scripts/offline-data/verify.ts [--db-path <path>]
 */

import { join } from 'node:path';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { DatasetType } from '@ncbijs/store';

interface VerificationCheck {
  readonly dataset: DatasetType;
  readonly description: string;
  readonly check: (storage: DuckDbFileStorage) => Promise<boolean>;
}

const CHECKS: ReadonlyArray<VerificationCheck> = [
  {
    dataset: 'mesh',
    description: 'Lookup MeSH descriptor D000001 (Calcimycin)',
    check: async (storage) => {
      const record = await storage.getRecord<Record<string, unknown>>('mesh', 'D000001');

      if (record === undefined) {
        return false;
      }

      console.log(`    id: ${String(record['id'])}, name: ${String(record['name'])}`);
      return true;
    },
  },
  {
    dataset: 'mesh',
    description: 'Search MeSH by name prefix "Aspirin"',
    check: async (storage) => {
      const results = await storage.searchRecords<Record<string, unknown>>('mesh', {
        field: 'name',
        value: 'Aspirin',
        operator: 'starts_with',
        limit: 3,
      });

      console.log(`    Found ${String(results.length)} result(s)`);
      return results.length > 0;
    },
  },
  {
    dataset: 'clinvar',
    description: 'Search ClinVar for Pathogenic variants (limit 3)',
    check: async (storage) => {
      const results = await storage.searchRecords<Record<string, unknown>>('clinvar', {
        field: 'clinicalSignificance',
        value: 'Pathogenic',
        limit: 3,
      });

      console.log(`    Found ${String(results.length)} Pathogenic variant(s)`);
      return results.length > 0;
    },
  },
  {
    dataset: 'genes',
    description: 'Lookup gene BRCA1 (geneId 672)',
    check: async (storage) => {
      const record = await storage.getRecord<Record<string, unknown>>('genes', '672');

      if (record === undefined) {
        return false;
      }

      console.log(`    geneId: ${String(record['geneId'])}, symbol: ${String(record['symbol'])}`);
      return true;
    },
  },
  {
    dataset: 'genes',
    description: 'Search genes by symbol "TP53"',
    check: async (storage) => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'TP53',
      });

      console.log(`    Found ${String(results.length)} result(s)`);
      return results.length > 0;
    },
  },
  {
    dataset: 'taxonomy',
    description: 'Lookup Homo sapiens (taxId 9606)',
    check: async (storage) => {
      const record = await storage.getRecord<Record<string, unknown>>('taxonomy', '9606');

      if (record === undefined) {
        return false;
      }

      console.log(
        `    taxId: ${String(record['taxId'])}, name: ${String(record['organismName'])}, rank: ${String(record['rank'])}`,
      );
      return true;
    },
  },
  {
    dataset: 'compounds',
    description: 'Lookup Aspirin (cid 2244)',
    check: async (storage) => {
      const record = await storage.getRecord<Record<string, unknown>>('compounds', '2244');

      if (record === undefined) {
        return false;
      }

      console.log(
        `    cid: ${String(record['cid'])}, SMILES: ${String(record['canonicalSmiles'])}`,
      );
      return true;
    },
  },
  {
    dataset: 'id-mappings',
    description: 'Search ID mappings by PMID (limit 3)',
    check: async (storage) => {
      const results = await storage.searchRecords<Record<string, unknown>>('id-mappings', {
        field: 'pmid',
        value: '12345678',
        limit: 3,
      });

      console.log(`    Found ${String(results.length)} mapping(s) for PMID 12345678`);
      return true;
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
  const dbPath = parseArgValue('--db-path') ?? join(process.cwd(), 'data', 'ncbijs.duckdb');

  console.log(`Database: ${dbPath}\n`);

  const storage = await DuckDbFileStorage.open(dbPath);

  console.log('--- Stats ---');
  const stats = await storage.getStats();

  for (const entry of stats) {
    console.log(`  ${entry.dataset.padEnd(15)} ${String(entry.recordCount).padStart(12)} records`);
  }

  console.log('\n--- Verification Checks ---\n');

  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    const statsEntry = stats.find((s) => s.dataset === check.dataset);

    if (statsEntry === undefined || statsEntry.recordCount === 0) {
      console.log(`  [skip] ${check.description} — no data loaded for ${check.dataset}`);
      continue;
    }

    try {
      const ok = await check.check(storage);

      if (ok) {
        console.log(`  [pass] ${check.description}`);
        passed++;
      } else {
        console.log(`  [fail] ${check.description} — record not found`);
        failed++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  [fail] ${check.description} — ${message}`);
      failed++;
    }
  }

  console.log(`\n${String(passed)} passed, ${String(failed)} failed`);

  await storage.close();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
