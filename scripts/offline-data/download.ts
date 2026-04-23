/* eslint-disable no-console */
/**
 * Download NCBI bulk data files for offline storage.
 *
 * Usage: npx tsx scripts/offline-data/download.ts [--output-dir <path>]
 *
 * Downloads ~4.4 GB of compressed data from NCBI FTP servers.
 * Files are saved to data/raw/ by default.
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';

interface DownloadSource {
  readonly name: string;
  readonly url: string;
  readonly outputFile: string;
  readonly decompress?: boolean;
}

const SOURCES: ReadonlyArray<DownloadSource> = [
  {
    name: 'MeSH Descriptors',
    url: 'https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml',
    outputFile: 'desc2025.xml',
  },
  {
    name: 'PMC ID Mapping',
    url: 'https://ftp.ncbi.nlm.nih.gov/pub/pmc/PMC-ids.csv.gz',
    outputFile: 'PMC-ids.csv',
    decompress: true,
  },
  {
    name: 'ClinVar Variant Summary',
    url: 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz',
    outputFile: 'variant_summary.txt',
    decompress: true,
  },
  {
    name: 'Gene Info',
    url: 'https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz',
    outputFile: 'gene_info.tsv',
    decompress: true,
  },
  {
    name: 'Taxonomy Dump (names)',
    url: 'https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/taxdump.tar.gz',
    outputFile: 'taxdump.tar.gz',
  },
  {
    name: 'PubChem CID-SMILES',
    url: 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-SMILES.gz',
    outputFile: 'CID-SMILES.tsv',
    decompress: true,
  },
  {
    name: 'PubChem CID-InChI-Key',
    url: 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-InChI-Key.gz',
    outputFile: 'CID-InChI-Key.tsv',
    decompress: true,
  },
  {
    name: 'PubChem CID-IUPAC',
    url: 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-IUPAC.gz',
    outputFile: 'CID-IUPAC.tsv',
    decompress: true,
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function downloadFile(source: DownloadSource, outputDir: string): Promise<void> {
  const outputPath = join(outputDir, source.outputFile);

  if (existsSync(outputPath)) {
    console.log(`  [skip] ${source.name} — already exists at ${outputPath}`);
    return;
  }

  console.log(`  [download] ${source.name} from ${source.url}`);

  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(
      `Failed to download ${source.name}: ${String(response.status)} ${response.statusText}`,
    );
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength !== null ? Number.parseInt(contentLength, 10) : 0;

  if (totalBytes > 0) {
    console.log(`  [size] ${formatBytes(totalBytes)} compressed`);
  }

  if (response.body === null) {
    throw new Error(`No response body for ${source.name}`);
  }

  const readableStream = Readable.fromWeb(response.body as never);

  if (source.decompress === true) {
    const gunzip = createGunzip();
    const fileStream = createWriteStream(outputPath);
    await pipeline(readableStream, gunzip, fileStream);
  } else {
    const fileStream = createWriteStream(outputPath);
    await pipeline(readableStream, fileStream);
  }

  console.log(`  [done] Saved to ${outputPath}`);
}

function parseArgValue(flag: string): string | undefined {
  const flagIndex = process.argv.indexOf(flag);

  if (flagIndex === -1) {
    return undefined;
  }

  return process.argv[flagIndex + 1];
}

async function main(): Promise<void> {
  const outputDir = parseArgValue('--output-dir') ?? join(process.cwd(), 'data', 'raw');

  console.log(`Output directory: ${outputDir}\n`);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}\n`);
  }

  const startTime = Date.now();

  for (const source of SOURCES) {
    try {
      await downloadFile(source, outputDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  [error] ${source.name}: ${message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDownload complete in ${elapsed}s`);
  console.log('\nNote: taxdump.tar.gz needs manual extraction:');
  console.log(
    `  tar -xzf ${join(outputDir, 'taxdump.tar.gz')} -C ${outputDir} names.dmp nodes.dmp`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
