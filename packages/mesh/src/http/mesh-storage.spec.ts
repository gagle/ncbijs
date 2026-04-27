import { describe, expect, it, vi } from 'vitest';
import { MeSH } from './mesh';
import type { DataStorage, MeshDescriptor } from '../interfaces/mesh.interface';
import { StorageModeError } from '../interfaces/mesh.interface';

function buildMockStorage(overrides: Partial<DataStorage> = {}): DataStorage {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    searchRecords: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildDescriptor(overrides: Partial<MeshDescriptor> = {}): MeshDescriptor {
  return {
    id: 'D001249',
    name: 'Asthma',
    treeNumbers: ['C08.127.108'],
    qualifiers: [],
    pharmacologicalActions: [],
    supplementaryConcepts: [],
    ...overrides,
  };
}

describe('MeSH (storage mode)', () => {
  describe('fromStorage', () => {
    it('creates an instance in storage mode', () => {
      const storage = buildMockStorage();
      const mesh = MeSH.fromStorage(storage);
      expect(mesh).toBeInstanceOf(MeSH);
    });
  });

  describe('lookupOnline', () => {
    it('searches mesh records by name with contains operator', async () => {
      const descriptor = buildDescriptor();
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValue([descriptor]),
      });
      const mesh = MeSH.fromStorage(storage);
      const results = await mesh.lookupOnline('Asthma');
      expect(storage.searchRecords).toHaveBeenCalledWith('mesh', {
        field: 'name',
        value: 'Asthma',
        operator: 'contains',
        limit: 10,
      });
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('D001249');
      expect(results[0]!.name).toBe('Asthma');
    });

    it('returns empty array when no matches found', async () => {
      const storage = buildMockStorage();
      const mesh = MeSH.fromStorage(storage);
      const results = await mesh.lookupOnline('NonexistentTerm');
      expect(results).toHaveLength(0);
    });

    it('returns multiple descriptors when storage matches several', async () => {
      const descriptors = [
        buildDescriptor({ id: 'D001249', name: 'Asthma' }),
        buildDescriptor({ id: 'D001250', name: 'Asthma, Exercise-Induced' }),
      ];
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValue(descriptors),
      });
      const mesh = MeSH.fromStorage(storage);
      const results = await mesh.lookupOnline('Asthma');
      expect(results).toHaveLength(2);
    });
  });

  describe('HTTP-only methods throw StorageModeError', () => {
    const storage = buildMockStorage();

    it('lookup throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.lookup('D001249')).toThrow(StorageModeError);
      expect(() => mesh.lookup('D001249')).toThrow('lookup is not available in storage mode');
    });

    it('expand throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.expand('D001249')).toThrow(StorageModeError);
    });

    it('ancestors throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.ancestors('D001249')).toThrow(StorageModeError);
    });

    it('children throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.children('D001249')).toThrow(StorageModeError);
    });

    it('treePath throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.treePath('D001249')).toThrow(StorageModeError);
    });

    it('toQuery throws StorageModeError', () => {
      const mesh = MeSH.fromStorage(storage);
      expect(() => mesh.toQuery('D001249')).toThrow(StorageModeError);
    });

    it('sparql throws StorageModeError', async () => {
      const mesh = MeSH.fromStorage(storage);
      await expect(mesh.sparql('SELECT * WHERE { ?s ?p ?o }')).rejects.toThrow(StorageModeError);
    });
  });
});
