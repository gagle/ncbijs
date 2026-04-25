import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline, createCompositeSource } from '@ncbijs/pipeline';
import type { Source } from '@ncbijs/pipeline';
import { DuckDbFileStorage } from '@ncbijs/store';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { parseGeneInfoTsv, parseTaxonomyDump } from '@ncbijs/datasets';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';

const fixturesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../bulk-parsers/__fixtures__',
);

function createFileSource(filePath: string): Source<string> {
  return {
    async *open(_signal: AbortSignal): AsyncIterable<string> {
      yield await readFile(filePath, 'utf-8');
    },
  };
}

describe('pipeline: file → parse → DuckDB', () => {
  let storage: DuckDbFileStorage;

  beforeEach(async () => {
    storage = await DuckDbFileStorage.open(':memory:');
  });

  afterEach(async () => {
    await storage.close();
  });

  it('loads MeSH descriptors from XML file into DuckDB', async () => {
    const result = await pipeline(
      createFileSource(resolve(fixturesDir, 'mesh-descriptors-sample.xml')),
      (xml: string) => parseMeshDescriptorXml(xml).descriptors,
      storage.createSink('mesh'),
    );

    expect(result.recordsProcessed).toBe(3);
    expect(result.batchesWritten).toBe(1);

    const record = await storage.getRecord<Record<string, unknown>>('mesh', 'D000001');
    expect(record).toBeDefined();
    expect(record?.['name']).toBe('Calcimycin');
  });

  it('loads ClinVar variants from TSV file into DuckDB', async () => {
    const result = await pipeline(
      createFileSource(resolve(fixturesDir, 'variant_summary.tsv')),
      (tsv: string) => parseVariantSummaryTsv(tsv),
      storage.createSink('clinvar'),
    );

    expect(result.recordsProcessed).toBeGreaterThan(0);

    const stats = await storage.getStats();
    const clinvarStats = stats.find((s) => s.dataset === 'clinvar');
    expect(clinvarStats?.recordCount).toBeGreaterThan(0);
  });

  it('loads gene info from TSV file into DuckDB', async () => {
    const result = await pipeline(
      createFileSource(resolve(fixturesDir, 'gene_info.tsv')),
      (tsv: string) => parseGeneInfoTsv(tsv),
      storage.createSink('genes'),
    );

    expect(result.recordsProcessed).toBeGreaterThan(0);

    const genes = await storage.searchRecords<Record<string, unknown>>('genes', {
      field: 'taxId',
      value: '7',
      operator: 'eq',
    });
    expect(genes.length).toBeGreaterThan(0);
  });

  it('loads taxonomy from composite source (names.dmp + nodes.dmp) into DuckDB', async () => {
    const result = await pipeline(
      createCompositeSource({
        namesDmp: createFileSource(resolve(fixturesDir, 'names.dmp')),
        nodesDmp: createFileSource(resolve(fixturesDir, 'nodes.dmp')),
      }),
      (composite: Record<string, string>) =>
        parseTaxonomyDump({
          namesDmp: composite['namesDmp'] ?? '',
          nodesDmp: composite['nodesDmp'] ?? '',
        }),
      storage.createSink('taxonomy'),
    );

    expect(result.recordsProcessed).toBeGreaterThan(0);

    const stats = await storage.getStats();
    const taxonomyStats = stats.find((s) => s.dataset === 'taxonomy');
    expect(taxonomyStats?.recordCount).toBe(result.recordsProcessed);
  });

  it('loads PMC ID mappings from CSV file into DuckDB', async () => {
    const result = await pipeline(
      createFileSource(resolve(fixturesDir, 'pmc-ids.csv')),
      (csv: string) => parsePmcIdsCsv(csv),
      storage.createSink('id-mappings'),
    );

    expect(result.recordsProcessed).toBeGreaterThan(0);
    expect(result.batchesWritten).toBeGreaterThanOrEqual(1);
  });

  it('reports progress during pipeline execution', async () => {
    const progressEvents: Array<{ recordsProcessed: number; batchesWritten: number }> = [];

    await pipeline(
      createFileSource(resolve(fixturesDir, 'mesh-descriptors-sample.xml')),
      (xml: string) => parseMeshDescriptorXml(xml).descriptors,
      storage.createSink('mesh'),
      {
        onProgress: (event) => {
          progressEvents.push({
            recordsProcessed: event.recordsProcessed,
            batchesWritten: event.batchesWritten,
          });
        },
      },
    );

    expect(progressEvents.length).toBeGreaterThan(0);
    const lastEvent = progressEvents[progressEvents.length - 1];
    expect(lastEvent?.recordsProcessed).toBe(3);
  });

  it('supports abort signal to cancel pipeline', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pipeline(
        createFileSource(resolve(fixturesDir, 'mesh-descriptors-sample.xml')),
        (xml: string) => parseMeshDescriptorXml(xml).descriptors,
        storage.createSink('mesh'),
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });
});
