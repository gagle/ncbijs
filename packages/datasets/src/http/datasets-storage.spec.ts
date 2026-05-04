import { describe, expect, it, vi } from 'vitest';
import { Datasets } from './datasets';
import type { DataStorage, GeneReport, TaxonomyReport } from '../interfaces/datasets.interface';
import { StorageModeError } from '../interfaces/datasets.interface';

function buildMockStorage(overrides: Partial<DataStorage> = {}): DataStorage {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    searchRecords: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildGeneReport(overrides: Partial<GeneReport> = {}): GeneReport {
  return {
    geneId: 7157,
    symbol: 'TP53',
    description: 'tumor protein p53',
    taxId: 9606,
    taxName: 'Homo sapiens',
    commonName: 'human',
    type: 'protein-coding',
    chromosomes: ['17'],
    synonyms: ['p53', 'LFS1'],
    swissProtAccessions: ['P04637'],
    ensemblGeneIds: ['ENSG00000141510'],
    omimIds: ['191170'],
    summary: 'Acts as a tumor suppressor.',
    transcriptCount: 30,
    proteinCount: 20,
    geneOntology: { molecularFunctions: [], biologicalProcesses: [], cellularComponents: [] },
    ...overrides,
  };
}

function buildTaxonomyReport(overrides: Partial<TaxonomyReport> = {}): TaxonomyReport {
  return {
    taxId: 9606,
    organismName: 'Homo sapiens',
    commonName: 'human',
    rank: 'species',
    lineage: [],
    children: [],
    counts: [],
    ...overrides,
  };
}

describe('Datasets (storage mode)', () => {
  describe('fromStorage', () => {
    it('creates an instance in storage mode', () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      expect(datasets).toBeInstanceOf(Datasets);
    });
  });

  describe('geneById', () => {
    it('fetches gene by ID from storage', async () => {
      const gene = buildGeneReport();
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(gene),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneById([7157]);
      expect(storage.getRecord).toHaveBeenCalledWith('genes', '7157');
      expect(results).toHaveLength(1);
      expect(results[0]!.symbol).toBe('TP53');
    });

    it('fetches multiple genes by ID', async () => {
      const tp53 = buildGeneReport({ geneId: 7157, symbol: 'TP53' });
      const brca1 = buildGeneReport({ geneId: 672, symbol: 'BRCA1' });
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValueOnce(tp53).mockResolvedValueOnce(brca1),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneById([7157, 672]);
      expect(results).toHaveLength(2);
      expect(results[0]!.symbol).toBe('TP53');
      expect(results[1]!.symbol).toBe('BRCA1');
    });

    it('skips missing records', async () => {
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(undefined),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneById([99999]);
      expect(results).toHaveLength(0);
    });

    it('throws when geneIds is empty', async () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.geneById([])).rejects.toThrow('geneIds must not be empty');
    });
  });

  describe('geneBySymbol', () => {
    it('searches genes by symbol with eq operator', async () => {
      const gene = buildGeneReport();
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValue([gene]),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneBySymbol(['TP53'], 'human');
      expect(storage.searchRecords).toHaveBeenCalledWith('genes', {
        field: 'symbol',
        value: 'TP53',
        operator: 'eq',
      });
      expect(results).toHaveLength(1);
      expect(results[0]!.geneId).toBe(7157);
    });

    it('searches multiple symbols sequentially', async () => {
      const tp53 = buildGeneReport({ geneId: 7157, symbol: 'TP53' });
      const brca1 = buildGeneReport({ geneId: 672, symbol: 'BRCA1' });
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValueOnce([tp53]).mockResolvedValueOnce([brca1]),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneBySymbol(['TP53', 'BRCA1'], 'human');
      expect(results).toHaveLength(2);
    });

    it('returns empty array when no matches found', async () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.geneBySymbol(['UNKNOWN'], 'human');
      expect(results).toHaveLength(0);
    });

    it('throws when symbols is empty', async () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.geneBySymbol([], 'human')).rejects.toThrow('symbols must not be empty');
    });
  });

  describe('taxonomy', () => {
    it('fetches taxonomy by numeric ID from storage', async () => {
      const taxReport = buildTaxonomyReport();
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(taxReport),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.taxonomy([9606]);
      expect(storage.getRecord).toHaveBeenCalledWith('taxonomy', '9606');
      expect(results).toHaveLength(1);
      expect(results[0]!.organismName).toBe('Homo sapiens');
    });

    it('searches taxonomy by string name with contains operator', async () => {
      const taxReport = buildTaxonomyReport();
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValue([taxReport]),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.taxonomy(['Homo sapiens']);
      expect(storage.searchRecords).toHaveBeenCalledWith('taxonomy', {
        field: 'organismName',
        value: 'Homo sapiens',
        operator: 'contains',
      });
      expect(results).toHaveLength(1);
    });

    it('handles mixed numeric and string taxons', async () => {
      const byId = buildTaxonomyReport({ taxId: 9606, organismName: 'Homo sapiens' });
      const byName = buildTaxonomyReport({ taxId: 10090, organismName: 'Mus musculus' });
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(byId),
        searchRecords: vi.fn().mockResolvedValue([byName]),
      });
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.taxonomy([9606, 'Mus musculus']);
      expect(storage.getRecord).toHaveBeenCalledWith('taxonomy', '9606');
      expect(storage.searchRecords).toHaveBeenCalledWith('taxonomy', {
        field: 'organismName',
        value: 'Mus musculus',
        operator: 'contains',
      });
      expect(results).toHaveLength(2);
    });

    it('skips missing records for numeric IDs', async () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      const results = await datasets.taxonomy([99999]);
      expect(results).toHaveLength(0);
    });

    it('throws when taxons is empty', async () => {
      const storage = buildMockStorage();
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.taxonomy([])).rejects.toThrow('taxons must not be empty');
    });
  });

  describe('HTTP-only methods throw StorageModeError', () => {
    const storage = buildMockStorage();

    it('genomeByAccession throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.genomeByAccession(['GCF_000001405.40'])).rejects.toThrow(
        StorageModeError,
      );
      await expect(datasets.genomeByAccession(['GCF_000001405.40'])).rejects.toThrow(
        'genomeByAccession is not available in storage mode',
      );
    });

    it('genomeByTaxon throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.genomeByTaxon(9606)).rejects.toThrow(StorageModeError);
    });

    it('virusByAccession throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.virusByAccession(['NC_045512.2'])).rejects.toThrow(StorageModeError);
    });

    it('virusByTaxon throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.virusByTaxon(2697049)).rejects.toThrow(StorageModeError);
    });

    it('biosample throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.biosample(['SAMN12345678'])).rejects.toThrow(StorageModeError);
    });

    it('geneLinks throws StorageModeError', async () => {
      const datasets = Datasets.fromStorage(storage);
      await expect(datasets.geneLinks([7157])).rejects.toThrow(StorageModeError);
    });
  });
});
