import { describe, expect, it, vi } from 'vitest';
import { PubChem } from './pubchem';
import type { CompoundProperty, DataStorage } from '../interfaces/pubchem.interface';
import { StorageModeError } from '../interfaces/pubchem.interface';

function buildMockStorage(overrides: Partial<DataStorage> = {}): DataStorage {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    searchRecords: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildCompoundProperty(overrides: Partial<CompoundProperty> = {}): CompoundProperty {
  return {
    cid: 2244,
    molecularFormula: 'C9H8O4',
    molecularWeight: 180.16,
    canonicalSmiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    isomericSmiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    inchi: 'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
    inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    iupacName: '2-acetoxybenzoic acid',
    xLogP: 1.2,
    exactMass: 180.042,
    monoisotopicMass: 180.042,
    tpsa: 63.6,
    complexity: 212,
    hBondDonorCount: 1,
    hBondAcceptorCount: 4,
    rotatableBondCount: 3,
    heavyAtomCount: 13,
    ...overrides,
  };
}

describe('PubChem (storage mode)', () => {
  describe('fromStorage', () => {
    it('creates an instance in storage mode', () => {
      const storage = buildMockStorage();
      const pubchem = PubChem.fromStorage(storage);
      expect(pubchem).toBeInstanceOf(PubChem);
    });
  });

  describe('compoundByCid', () => {
    it('fetches compound by CID from storage', async () => {
      const compound = buildCompoundProperty();
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(compound),
      });
      const pubchem = PubChem.fromStorage(storage);
      const result = await pubchem.compoundByCid(2244);
      expect(storage.getRecord).toHaveBeenCalledWith('compounds', '2244');
      expect(result.cid).toBe(2244);
      expect(result.iupacName).toBe('2-acetoxybenzoic acid');
    });

    it('throws when compound is not found in storage', async () => {
      const storage = buildMockStorage();
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundByCid(99999)).rejects.toThrow(
        'Compound with CID 99999 not found in storage',
      );
    });
  });

  describe('compoundByName', () => {
    it('throws StorageModeError', async () => {
      const storage = buildMockStorage();
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundByName('aspirin')).rejects.toThrow(StorageModeError);
      await expect(pubchem.compoundByName('aspirin')).rejects.toThrow(
        'compoundByName is not available in storage mode',
      );
    });
  });

  describe('HTTP-only methods throw StorageModeError', () => {
    const storage = buildMockStorage();

    it('compoundByCidBatch throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundByCidBatch([2244, 2519])).rejects.toThrow(StorageModeError);
    });

    it('compoundBySmiles throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundBySmiles('CC(=O)OC1=CC=CC=C1C(=O)O')).rejects.toThrow(
        StorageModeError,
      );
    });

    it('compoundByInchiKey throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundByInchiKey('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).rejects.toThrow(
        StorageModeError,
      );
    });

    it('cidsByName throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.cidsByName('aspirin')).rejects.toThrow(StorageModeError);
    });

    it('synonyms throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.synonyms(2244)).rejects.toThrow(StorageModeError);
    });

    it('description throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.description(2244)).rejects.toThrow(StorageModeError);
    });

    it('substanceBySid throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.substanceBySid(12345)).rejects.toThrow(StorageModeError);
    });

    it('substanceBySidBatch throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.substanceBySidBatch([12345, 67890])).rejects.toThrow(StorageModeError);
    });

    it('substanceByName throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.substanceByName('aspirin')).rejects.toThrow(StorageModeError);
    });

    it('substanceSynonyms throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.substanceSynonyms(12345)).rejects.toThrow(StorageModeError);
    });

    it('sidsByName throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.sidsByName('aspirin')).rejects.toThrow(StorageModeError);
    });

    it('assayByAid throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.assayByAid(12345)).rejects.toThrow(StorageModeError);
    });

    it('assayByAidBatch throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.assayByAidBatch([12345])).rejects.toThrow(StorageModeError);
    });

    it('assaySummary throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.assaySummary(12345)).rejects.toThrow(StorageModeError);
    });

    it('compoundAnnotations throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundAnnotations(2244)).rejects.toThrow(StorageModeError);
    });

    it('substanceAnnotations throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.substanceAnnotations(12345)).rejects.toThrow(StorageModeError);
    });

    it('assayAnnotations throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.assayAnnotations(12345)).rejects.toThrow(StorageModeError);
    });

    it('geneByGeneId throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.geneByGeneId(7157)).rejects.toThrow(StorageModeError);
    });

    it('geneByCid throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.geneByCid(2244)).rejects.toThrow(StorageModeError);
    });

    it('proteinByAccession throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.proteinByAccession('P04637')).rejects.toThrow(StorageModeError);
    });

    it('compoundClassification throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundClassification(2244)).rejects.toThrow(StorageModeError);
    });

    it('compoundPatents throws StorageModeError', async () => {
      const pubchem = PubChem.fromStorage(storage);
      await expect(pubchem.compoundPatents(2244)).rejects.toThrow(StorageModeError);
    });
  });
});
