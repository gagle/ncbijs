import { describe, expect, it, vi } from 'vitest';
import { createConverter } from './convert';
import type { ConvertedId, DataStorage } from '../interfaces/id-converter.interface';

function buildMockStorage(overrides: Partial<DataStorage> = {}): DataStorage {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    searchRecords: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildConvertedId(overrides: Partial<ConvertedId> = {}): ConvertedId {
  return {
    pmid: '35296856',
    pmcid: 'PMC9393730',
    doi: '10.1038/s41586-022-04569-x',
    ...overrides,
  };
}

describe('createConverter (storage mode)', () => {
  describe('factory', () => {
    it('returns a function', () => {
      const storage = buildMockStorage();
      const convertIds = createConverter(storage);
      expect(typeof convertIds).toBe('function');
    });
  });

  describe('convert', () => {
    it('fetches ID mapping by PMID from storage', async () => {
      const mapping = buildConvertedId();
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(mapping),
      });
      const convertIds = createConverter(storage);
      const results = await convertIds(['35296856']);
      expect(storage.getRecord).toHaveBeenCalledWith('id-mappings', '35296856');
      expect(results).toHaveLength(1);
      expect(results[0]!.pmid).toBe('35296856');
      expect(results[0]!.pmcid).toBe('PMC9393730');
      expect(results[0]!.doi).toBe('10.1038/s41586-022-04569-x');
    });

    it('fetches multiple ID mappings', async () => {
      const mapping1 = buildConvertedId({ pmid: '11111111' });
      const mapping2 = buildConvertedId({ pmid: '22222222' });
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValueOnce(mapping1).mockResolvedValueOnce(mapping2),
      });
      const convertIds = createConverter(storage);
      const results = await convertIds(['11111111', '22222222']);
      expect(results).toHaveLength(2);
      expect(results[0]!.pmid).toBe('11111111');
      expect(results[1]!.pmid).toBe('22222222');
    });

    it('skips IDs not found in storage', async () => {
      const storage = buildMockStorage();
      const convertIds = createConverter(storage);
      const results = await convertIds(['99999999']);
      expect(results).toHaveLength(0);
    });

    it('throws when ids array is empty', async () => {
      const storage = buildMockStorage();
      const convertIds = createConverter(storage);
      await expect(convertIds([])).rejects.toThrow('ids array must not be empty');
    });

    it('handles mixed found and missing IDs', async () => {
      const mapping = buildConvertedId({ pmid: '11111111' });
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValueOnce(mapping).mockResolvedValueOnce(undefined),
      });
      const convertIds = createConverter(storage);
      const results = await convertIds(['11111111', '99999999']);
      expect(results).toHaveLength(1);
      expect(results[0]!.pmid).toBe('11111111');
    });
  });
});
