import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DuckDbFileStorage } from './duckdb-file-storage';
import type { DatasetType } from './interfaces/storage.interface';

describe('DuckDbFileStorage', () => {
  let storage: DuckDbFileStorage;

  beforeEach(async () => {
    storage = await DuckDbFileStorage.open(':memory:');
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('open', () => {
    it('creates an in-memory storage instance', () => {
      expect(storage.path).toBe(':memory:');
    });
  });

  describe('writeRecords + getRecord', () => {
    it('round-trips mesh descriptors', async () => {
      const descriptor = {
        id: 'D000001',
        name: 'Calcimycin',
        treeNumbers: ['D03.633.100.221.173'],
        qualifiers: [{ name: 'adverse effects', abbreviation: 'AE' }],
        pharmacologicalActions: ['Ionophores'],
        supplementaryConcepts: [],
      };

      await storage.writeRecords('mesh', [descriptor]);
      const result = await storage.getRecord<Record<string, unknown>>('mesh', 'D000001');

      expect(result).toBeDefined();
      expect(result?.['id']).toBe('D000001');
      expect(result?.['name']).toBe('Calcimycin');
      expect(result?.['treeNumbers']).toEqual(['D03.633.100.221.173']);
      expect(result?.['qualifiers']).toEqual([{ name: 'adverse effects', abbreviation: 'AE' }]);
      expect(result?.['pharmacologicalActions']).toEqual(['Ionophores']);
      expect(result?.['supplementaryConcepts']).toEqual([]);
    });

    it('round-trips clinvar variants', async () => {
      const variant = {
        uid: '42',
        title: 'NM_014855.3(AP5Z1):c.80_83del',
        objectType: 'Deletion',
        accession: 'RCV000000012',
        accessionVersion: '3',
        clinicalSignificance: 'Pathogenic',
        genes: [{ geneId: 9907, symbol: 'AP5Z1' }],
        traits: [{ name: 'Spastic paraplegia 48', xrefs: [] }],
        locations: [{ assemblyName: 'GRCh38', chromosome: '7', start: 4775606, stop: 4775609 }],
        supportingSubmissions: ['SCV000012345'],
      };

      await storage.writeRecords('clinvar', [variant]);
      const result = await storage.getRecord<Record<string, unknown>>('clinvar', '42');

      expect(result).toBeDefined();
      expect(result?.['uid']).toBe('42');
      expect(result?.['title']).toBe('NM_014855.3(AP5Z1):c.80_83del');
      expect(result?.['objectType']).toBe('Deletion');
      expect(result?.['clinicalSignificance']).toBe('Pathogenic');
      expect(result?.['genes']).toEqual([{ geneId: 9907, symbol: 'AP5Z1' }]);
      expect(result?.['traits']).toEqual([{ name: 'Spastic paraplegia 48', xrefs: [] }]);
      expect(result?.['locations']).toEqual([
        { assemblyName: 'GRCh38', chromosome: '7', start: 4775606, stop: 4775609 },
      ]);
    });

    it('round-trips gene reports', async () => {
      const gene = {
        geneId: 672,
        symbol: 'BRCA1',
        description: 'BRCA1 DNA repair associated',
        taxId: 9606,
        taxName: 'Homo sapiens',
        commonName: 'human',
        type: 'protein-coding',
        chromosomes: ['17'],
        synonyms: ['IRIS', 'PSCP'],
        swissProtAccessions: ['P38398'],
        ensemblGeneIds: ['ENSG00000012048'],
        omimIds: ['113705'],
        summary: 'DNA repair gene',
        transcriptCount: 27,
        proteinCount: 12,
        geneOntology: {
          molecularFunctions: [{ name: 'DNA binding', goId: 'GO:0003677' }],
          biologicalProcesses: [],
          cellularComponents: [],
        },
      };

      await storage.writeRecords('genes', [gene]);
      const result = await storage.getRecord<Record<string, unknown>>('genes', '672');

      expect(result).toBeDefined();
      expect(result?.['geneId']).toBe(672);
      expect(result?.['symbol']).toBe('BRCA1');
      expect(result?.['taxId']).toBe(9606);
      expect(result?.['type']).toBe('protein-coding');
      expect(result?.['chromosomes']).toEqual(['17']);
      expect(result?.['geneOntology']).toEqual({
        molecularFunctions: [{ name: 'DNA binding', goId: 'GO:0003677' }],
        biologicalProcesses: [],
        cellularComponents: [],
      });
    });

    it('round-trips taxonomy reports', async () => {
      const taxon = {
        taxId: 9606,
        organismName: 'Homo sapiens',
        commonName: 'human',
        rank: 'species',
        lineage: [131567, 2759, 33154, 7742, 40674, 9443, 9606],
        children: [63221, 741158],
        counts: [{ type: 'genome', count: 15 }],
      };

      await storage.writeRecords('taxonomy', [taxon]);
      const result = await storage.getRecord<Record<string, unknown>>('taxonomy', '9606');

      expect(result).toBeDefined();
      expect(result?.['taxId']).toBe(9606);
      expect(result?.['organismName']).toBe('Homo sapiens');
      expect(result?.['rank']).toBe('species');
      expect(result?.['lineage']).toEqual([131567, 2759, 33154, 7742, 40674, 9443, 9606]);
      expect(result?.['children']).toEqual([63221, 741158]);
    });

    it('round-trips compound properties', async () => {
      const compound = {
        cid: 2244,
        canonicalSmiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        iupacName: '2-acetoxybenzoic acid',
      };

      await storage.writeRecords('compounds', [compound]);
      const result = await storage.getRecord<Record<string, unknown>>('compounds', '2244');

      expect(result).toBeDefined();
      expect(result?.['cid']).toBe(2244);
      expect(result?.['canonicalSmiles']).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
      expect(result?.['inchiKey']).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');
      expect(result?.['iupacName']).toBe('2-acetoxybenzoic acid');
    });

    it('round-trips id mappings', async () => {
      const mapping = {
        pmid: '12345678',
        pmcid: 'PMC9876543',
        doi: '10.1234/test.2023',
      };

      await storage.writeRecords('id-mappings', [mapping]);
      const result = await storage.getRecord<Record<string, unknown>>('id-mappings', 'PMC9876543');

      expect(result).toBeDefined();
      expect(result?.['pmid']).toBe('12345678');
      expect(result?.['pmcid']).toBe('PMC9876543');
      expect(result?.['doi']).toBe('10.1234/test.2023');
      expect(result?.['mid']).toBeUndefined();
    });

    it('looks up id mappings by pmid', async () => {
      const mapping = {
        pmid: '12345678',
        pmcid: 'PMC9876543',
        doi: '10.1234/test.2023',
      };

      await storage.writeRecords('id-mappings', [mapping]);
      const result = await storage.getRecord<Record<string, unknown>>('id-mappings', '12345678');

      expect(result).toBeDefined();
      expect(result?.['pmcid']).toBe('PMC9876543');
    });

    it('looks up id mappings by doi', async () => {
      const mapping = {
        pmid: '12345678',
        pmcid: 'PMC9876543',
        doi: '10.1234/test.2023',
      };

      await storage.writeRecords('id-mappings', [mapping]);
      const result = await storage.getRecord<Record<string, unknown>>(
        'id-mappings',
        '10.1234/test.2023',
      );

      expect(result).toBeDefined();
      expect(result?.['pmid']).toBe('12345678');
    });
  });

  describe('writeRecords edge cases', () => {
    it('does nothing for empty records array', async () => {
      await storage.writeRecords('mesh', []);
      const stats = await storage.getStats();
      const meshStats = stats.find((s) => s.dataset === 'mesh');

      expect(meshStats?.recordCount).toBe(0);
    });

    it('replaces existing records on primary key conflict', async () => {
      const original = {
        id: 'D000001',
        name: 'Calcimycin',
        treeNumbers: [],
        qualifiers: [],
        pharmacologicalActions: [],
        supplementaryConcepts: [],
      };

      const updated = {
        id: 'D000001',
        name: 'Calcimycin Updated',
        treeNumbers: ['D03.633'],
        qualifiers: [],
        pharmacologicalActions: [],
        supplementaryConcepts: [],
      };

      await storage.writeRecords('mesh', [original]);
      await storage.writeRecords('mesh', [updated]);

      const result = await storage.getRecord<Record<string, unknown>>('mesh', 'D000001');
      expect(result?.['name']).toBe('Calcimycin Updated');
      expect(result?.['treeNumbers']).toEqual(['D03.633']);
    });

    it('writes multiple records in a single call', async () => {
      const records = [
        {
          cid: 1,
          canonicalSmiles: 'C',
          inchiKey: 'KEY1',
          iupacName: 'methane',
        },
        {
          cid: 2,
          canonicalSmiles: 'CC',
          inchiKey: 'KEY2',
          iupacName: 'ethane',
        },
        {
          cid: 3,
          canonicalSmiles: 'CCC',
          inchiKey: 'KEY3',
          iupacName: 'propane',
        },
      ];

      await storage.writeRecords('compounds', records);

      const result1 = await storage.getRecord<Record<string, unknown>>('compounds', '1');
      const result2 = await storage.getRecord<Record<string, unknown>>('compounds', '2');
      const result3 = await storage.getRecord<Record<string, unknown>>('compounds', '3');

      expect(result1?.['iupacName']).toBe('methane');
      expect(result2?.['iupacName']).toBe('ethane');
      expect(result3?.['iupacName']).toBe('propane');
    });
  });

  describe('getRecord edge cases', () => {
    it('returns undefined for missing key', async () => {
      const result = await storage.getRecord('mesh', 'NONEXISTENT');
      expect(result).toBeUndefined();
    });

    it('returns undefined for invalid integer key', async () => {
      const result = await storage.getRecord('genes', 'not-a-number');
      expect(result).toBeUndefined();
    });
  });

  describe('searchRecords', () => {
    const sampleGenes = [
      {
        geneId: 672,
        symbol: 'BRCA1',
        description: 'BRCA1 DNA repair associated',
        taxId: 9606,
        taxName: 'Homo sapiens',
        commonName: 'human',
        type: 'protein-coding',
        chromosomes: ['17'],
        synonyms: [],
        swissProtAccessions: [],
        ensemblGeneIds: [],
        omimIds: [],
        summary: '',
        transcriptCount: 0,
        proteinCount: 0,
        geneOntology: { molecularFunctions: [], biologicalProcesses: [], cellularComponents: [] },
      },
      {
        geneId: 675,
        symbol: 'BRCA2',
        description: 'BRCA2 DNA repair associated',
        taxId: 9606,
        taxName: 'Homo sapiens',
        commonName: 'human',
        type: 'protein-coding',
        chromosomes: ['13'],
        synonyms: [],
        swissProtAccessions: [],
        ensemblGeneIds: [],
        omimIds: [],
        summary: '',
        transcriptCount: 0,
        proteinCount: 0,
        geneOntology: { molecularFunctions: [], biologicalProcesses: [], cellularComponents: [] },
      },
      {
        geneId: 7157,
        symbol: 'TP53',
        description: 'tumor protein p53',
        taxId: 9606,
        taxName: 'Homo sapiens',
        commonName: 'human',
        type: 'protein-coding',
        chromosomes: ['17'],
        synonyms: [],
        swissProtAccessions: [],
        ensemblGeneIds: [],
        omimIds: [],
        summary: '',
        transcriptCount: 0,
        proteinCount: 0,
        geneOntology: { molecularFunctions: [], biologicalProcesses: [], cellularComponents: [] },
      },
    ];

    beforeEach(async () => {
      await storage.writeRecords('genes', sampleGenes);
    });

    it('searches with eq operator', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'BRCA1',
        operator: 'eq',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.['symbol']).toBe('BRCA1');
    });

    it('searches with contains operator', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'BRCA',
        operator: 'contains',
      });

      expect(results).toHaveLength(2);
    });

    it('searches with starts_with operator', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'BR',
        operator: 'starts_with',
      });

      expect(results).toHaveLength(2);
    });

    it('defaults to eq operator when not specified', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'TP53',
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.['symbol']).toBe('TP53');
    });

    it('applies limit', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'taxId',
        value: '9606',
        operator: 'eq',
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });

    it('returns empty array when no matches', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'symbol',
        value: 'NONEXISTENT',
      });

      expect(results).toEqual([]);
    });

    it('throws for invalid column name', async () => {
      await expect(
        storage.searchRecords('genes', {
          field: 'DROP TABLE--',
          value: 'test',
        }),
      ).rejects.toThrow('Invalid column name');
    });

    it('searches with camelCase field names', async () => {
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field: 'commonName',
        value: 'human',
      });

      expect(results).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('returns zero counts for empty tables', async () => {
      const stats = await storage.getStats();

      expect(stats).toHaveLength(6);

      for (const entry of stats) {
        expect(entry.recordCount).toBe(0);
        expect(entry.sizeBytes).toBe(0);
      }
    });

    it('returns correct counts after writes', async () => {
      await storage.writeRecords('compounds', [
        { cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' },
        { cid: 2, canonicalSmiles: 'CC', inchiKey: 'K2', iupacName: 'ethane' },
      ]);

      await storage.writeRecords('mesh', [
        {
          id: 'D000001',
          name: 'Test',
          treeNumbers: [],
          qualifiers: [],
          pharmacologicalActions: [],
          supplementaryConcepts: [],
        },
      ]);

      const stats = await storage.getStats();
      const compoundStats = stats.find((s) => s.dataset === 'compounds');
      const meshStats = stats.find((s) => s.dataset === 'mesh');

      expect(compoundStats?.recordCount).toBe(2);
      expect(meshStats?.recordCount).toBe(1);
    });

    it('includes all dataset types', async () => {
      const stats = await storage.getStats();
      const datasets = stats.map((s) => s.dataset);
      const expectedDatasets: ReadonlyArray<DatasetType> = [
        'mesh',
        'clinvar',
        'genes',
        'taxonomy',
        'compounds',
        'id-mappings',
      ];

      expect(datasets).toEqual(expectedDatasets);
    });
  });

  describe('serialization edge cases', () => {
    it('handles missing properties in mesh records gracefully', async () => {
      await storage.writeRecords('mesh', [{ id: 'D999999' }]);
      const result = await storage.getRecord<Record<string, unknown>>('mesh', 'D999999');

      expect(result).toBeDefined();
      expect(result?.['name']).toBe('');
      expect(result?.['treeNumbers']).toEqual([]);
      expect(result?.['qualifiers']).toEqual([]);
    });

    it('handles null values in id-mapping fields', async () => {
      await storage.writeRecords('id-mappings', [
        { pmid: null, pmcid: null, doi: null, mid: null, live: false, releaseDate: '' },
      ]);

      const stats = await storage.getStats();
      const idStats = stats.find((s) => s.dataset === 'id-mappings');
      expect(idStats?.recordCount).toBe(1);
    });

    it('handles undefined values in id-mapping fields', async () => {
      await storage.writeRecords('id-mappings', [
        { pmid: undefined, pmcid: 'PMC001', live: true, releaseDate: '2023-01-01' },
      ]);

      const result = await storage.getRecord<Record<string, unknown>>('id-mappings', 'PMC001');
      expect(result?.['pmid']).toBeNull();
      expect(result?.['pmcid']).toBe('PMC001');
    });

    it('handles completely empty object records', async () => {
      await storage.writeRecords('compounds', [
        { cid: 99, canonicalSmiles: '', inchiKey: '', iupacName: '' },
      ]);

      const result = await storage.getRecord<Record<string, unknown>>('compounds', '99');
      expect(result).toBeDefined();
      expect(result?.['cid']).toBe(99);
    });

    it('handles missing nested array fields in gene records', async () => {
      await storage.writeRecords('genes', [{ geneId: 1, symbol: 'TEST', taxId: 9606 }]);

      const result = await storage.getRecord<Record<string, unknown>>('genes', '1');
      expect(result?.['chromosomes']).toEqual([]);
      expect(result?.['synonyms']).toEqual([]);
      expect(result?.['geneOntology']).toEqual({});
    });

    it('handles missing fields in taxonomy records', async () => {
      await storage.writeRecords('taxonomy', [{ taxId: 1 }]);

      const result = await storage.getRecord<Record<string, unknown>>('taxonomy', '1');
      expect(result?.['organismName']).toBe('');
      expect(result?.['lineage']).toEqual([]);
      expect(result?.['children']).toEqual([]);
      expect(result?.['counts']).toEqual([]);
    });

    it('handles missing fields in clinvar records', async () => {
      await storage.writeRecords('clinvar', [{ uid: '999' }]);

      const result = await storage.getRecord<Record<string, unknown>>('clinvar', '999');
      expect(result?.['title']).toBe('');
      expect(result?.['genes']).toEqual([]);
      expect(result?.['traits']).toEqual([]);
      expect(result?.['locations']).toEqual([]);
    });

    it('deserializes null JSON columns as empty arrays', async () => {
      await storage.writeRecords('mesh', [
        {
          id: 'DNULL',
          name: 'NullTest',
          treeNumbers: [],
          qualifiers: [],
          pharmacologicalActions: [],
          supplementaryConcepts: [],
        },
      ]);

      const result = await storage.getRecord<Record<string, unknown>>('mesh', 'DNULL');
      expect(result?.['treeNumbers']).toEqual([]);
    });
  });

  describe('writeRecords error handling', () => {
    it('rolls back transaction on invalid data', async () => {
      await storage.writeRecords('compounds', [
        { cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' },
      ]);

      const stats = await storage.getStats();
      const compoundStats = stats.find((s) => s.dataset === 'compounds');
      expect(compoundStats?.recordCount).toBe(1);
    });
  });

  describe('close', () => {
    it('closes without error', async () => {
      await expect(storage.close()).resolves.toBeUndefined();
    });
  });
});
