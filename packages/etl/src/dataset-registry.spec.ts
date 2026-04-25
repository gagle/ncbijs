import { listDatasets, getDataset, getDescriptor } from './dataset-registry';
import type { EtlDatasetType } from './interfaces/etl.interface';

vi.mock('@ncbijs/pipeline', () => ({
  createHttpSource: vi.fn((url: string) => ({ type: 'http', url })),
  createCompositeSource: vi.fn((sources: Record<string, unknown>) => ({
    type: 'composite',
    keys: Object.keys(sources),
  })),
}));

vi.mock('@ncbijs/mesh', () => ({
  parseMeshDescriptorXml: vi.fn((xml: string) => ({ descriptors: [{ xml }] })),
}));

vi.mock('@ncbijs/clinvar', () => ({
  parseVariantSummaryTsv: vi.fn((tsv: string) => [{ tsv }]),
}));

vi.mock('@ncbijs/datasets', () => ({
  parseGeneInfoTsv: vi.fn((tsv: string) => [{ tsv }]),
  parseTaxonomyDump: vi.fn((input: Record<string, string>) => [{ input }]),
}));

vi.mock('@ncbijs/pubchem', () => ({
  parseCompoundExtras: vi.fn((input: Record<string, string>) => [{ input }]),
}));

vi.mock('@ncbijs/id-converter', () => ({
  parsePmcIdsCsv: vi.fn((csv: string) => [{ csv }]),
}));

describe('dataset-registry', () => {
  describe('listDatasets', () => {
    it('returns all 6 datasets', () => {
      const datasets = listDatasets();
      expect(datasets).toHaveLength(6);
    });

    it('includes all expected dataset IDs', () => {
      const ids = listDatasets().map((dataset) => dataset.id);
      expect(ids).toEqual(['mesh', 'clinvar', 'genes', 'taxonomy', 'compounds', 'id-mappings']);
    });

    it('each dataset has required metadata fields', () => {
      for (const dataset of listDatasets()) {
        expect(dataset.id).toBeDefined();
        expect(dataset.name).toBeDefined();
        expect(dataset.description).toBeDefined();
        expect(dataset.sourceUrls.length).toBeGreaterThan(0);
        expect(dataset.format).toBeDefined();
        expect(dataset.estimatedSize).toBeDefined();
        expect(dataset.estimatedRecords).toBeDefined();
        expect(dataset.updateFrequency).toBeDefined();
      }
    });
  });

  describe('getDataset', () => {
    it('returns metadata for a valid dataset', () => {
      const mesh = getDataset('mesh');
      expect(mesh.id).toBe('mesh');
      expect(mesh.name).toBe('MeSH Descriptors');
      expect(mesh.format).toBe('xml');
    });

    it('returns metadata for each dataset type', () => {
      const types: ReadonlyArray<EtlDatasetType> = [
        'mesh',
        'clinvar',
        'genes',
        'taxonomy',
        'compounds',
        'id-mappings',
      ];

      for (const datasetType of types) {
        const info = getDataset(datasetType);
        expect(info.id).toBe(datasetType);
      }
    });
  });

  describe('getDescriptor', () => {
    it('throws for unknown dataset', () => {
      expect(() => getDescriptor('nonexistent' as EtlDatasetType)).toThrow(
        'Unknown dataset: nonexistent',
      );
    });

    it('returns a descriptor with createSource and parse functions', () => {
      const descriptor = getDescriptor('clinvar');
      expect(typeof descriptor.createSource).toBe('function');
      expect(typeof descriptor.parse).toBe('function');
      expect(descriptor.info.id).toBe('clinvar');
    });

    it('taxonomy createSource throws with guidance', () => {
      const descriptor = getDescriptor('taxonomy');
      expect(() => descriptor.createSource()).toThrow('Taxonomy requires tar.gz extraction');
    });

    it('compounds descriptor has 3 source URLs', () => {
      const info = getDataset('compounds');
      expect(info.sourceUrls).toHaveLength(3);
    });

    it('mesh createSource calls createHttpSource with the MeSH URL', () => {
      const source = getDescriptor('mesh').createSource() as unknown as {
        type: string;
        url: string;
      };
      expect(source.type).toBe('http');
      expect(source.url).toContain('desc2025.xml');
    });

    it('mesh parse delegates to parseMeshDescriptorXml', () => {
      const result = getDescriptor('mesh').parse('<xml/>');
      expect(result).toEqual([{ xml: '<xml/>' }]);
    });

    it('clinvar createSource calls createHttpSource with the ClinVar URL', () => {
      const source = getDescriptor('clinvar').createSource() as unknown as {
        type: string;
        url: string;
      };
      expect(source.type).toBe('http');
      expect(source.url).toContain('variant_summary.txt.gz');
    });

    it('clinvar parse delegates to parseVariantSummaryTsv', () => {
      const result = getDescriptor('clinvar').parse('tsv-data');
      expect(result).toEqual([{ tsv: 'tsv-data' }]);
    });

    it('genes createSource calls createHttpSource with the gene URL', () => {
      const source = getDescriptor('genes').createSource() as unknown as {
        type: string;
        url: string;
      };
      expect(source.type).toBe('http');
      expect(source.url).toContain('gene_info.gz');
    });

    it('genes parse delegates to parseGeneInfoTsv', () => {
      const result = getDescriptor('genes').parse('gene-tsv');
      expect(result).toEqual([{ tsv: 'gene-tsv' }]);
    });

    it('taxonomy parse delegates to parseTaxonomyDump', () => {
      const result = getDescriptor('taxonomy').parse({
        namesDmp: 'names-data',
        nodesDmp: 'nodes-data',
      });
      expect(result).toEqual([{ input: { namesDmp: 'names-data', nodesDmp: 'nodes-data' } }]);
    });

    it('taxonomy parse handles missing composite keys gracefully', () => {
      const result = getDescriptor('taxonomy').parse({} as Record<string, string>);
      expect(result).toEqual([{ input: { namesDmp: '', nodesDmp: '' } }]);
    });

    it('compounds createSource calls createCompositeSource with 3 HTTP sources', () => {
      const source = getDescriptor('compounds').createSource() as unknown as {
        type: string;
        keys: ReadonlyArray<string>;
      };
      expect(source.type).toBe('composite');
      expect(source.keys).toEqual(['cidSmiles', 'cidInchiKey', 'cidIupac']);
    });

    it('compounds parse delegates to parseCompoundExtras', () => {
      const result = getDescriptor('compounds').parse({
        cidSmiles: 's',
        cidInchiKey: 'i',
        cidIupac: 'u',
      });
      expect(result).toEqual([{ input: { cidSmiles: 's', cidInchiKey: 'i', cidIupac: 'u' } }]);
    });

    it('compounds parse handles missing composite keys gracefully', () => {
      const result = getDescriptor('compounds').parse({} as Record<string, string>);
      expect(result).toEqual([{ input: { cidSmiles: '', cidInchiKey: '', cidIupac: '' } }]);
    });

    it('id-mappings createSource calls createHttpSource with the PMC IDs URL', () => {
      const source = getDescriptor('id-mappings').createSource() as unknown as {
        type: string;
        url: string;
      };
      expect(source.type).toBe('http');
      expect(source.url).toContain('PMC-ids.csv.gz');
    });

    it('id-mappings parse delegates to parsePmcIdsCsv', () => {
      const result = getDescriptor('id-mappings').parse('csv-data');
      expect(result).toEqual([{ csv: 'csv-data' }]);
    });
  });
});
