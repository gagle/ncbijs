import { describe, expect, it, vi } from 'vitest';
import { ClinVar } from './clinvar';
import type { DataStorage, VariantReport } from '../interfaces/clinvar.interface';
import { StorageModeError } from '../interfaces/clinvar.interface';

function buildMockStorage(overrides: Partial<DataStorage> = {}): DataStorage {
  return {
    getRecord: vi.fn().mockResolvedValue(undefined),
    searchRecords: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildVariantReport(overrides: Partial<VariantReport> = {}): VariantReport {
  return {
    uid: '12345',
    title: 'NM_007294.4(BRCA1):c.68_69del (p.Glu23Valfs)',
    objectType: 'single nucleotide variant',
    accession: 'VCV000012345',
    accessionVersion: 'VCV000012345.1',
    clinicalSignificance: 'Pathogenic',
    reviewStatus: 'criteria provided, single submitter',
    lastEvaluated: '2023-01-01',
    genes: [{ symbol: 'BRCA1', geneId: 672 }],
    traits: [{ name: 'Hereditary breast and ovarian cancer', xrefs: [] }],
    locations: [],
    supportingSubmissions: [],
    ...overrides,
  };
}

describe('ClinVar (storage mode)', () => {
  describe('fromStorage', () => {
    it('creates an instance in storage mode', () => {
      const storage = buildMockStorage();
      const clinvar = ClinVar.fromStorage(storage);
      expect(clinvar).toBeInstanceOf(ClinVar);
    });
  });

  describe('searchAndFetch', () => {
    it('searches by title and genes, deduplicates results', async () => {
      const variant = buildVariantReport();
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValueOnce([variant]).mockResolvedValueOnce([variant]),
      });
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.searchAndFetch('BRCA1');
      expect(storage.searchRecords).toHaveBeenCalledTimes(2);
      expect(storage.searchRecords).toHaveBeenCalledWith('clinvar', {
        field: 'title',
        value: 'BRCA1',
        operator: 'contains',
        limit: 20,
      });
      expect(storage.searchRecords).toHaveBeenCalledWith('clinvar', {
        field: 'genes',
        value: 'BRCA1',
        operator: 'contains',
        limit: 20,
      });
      expect(results).toHaveLength(1);
    });

    it('merges results from title and genes without duplicates', async () => {
      const variant1 = buildVariantReport({ uid: '111', title: 'BRCA1 variant 1' });
      const variant2 = buildVariantReport({ uid: '222', title: 'TP53 variant with BRCA1 gene' });
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValueOnce([variant1]).mockResolvedValueOnce([variant2]),
      });
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.searchAndFetch('BRCA1');
      expect(results).toHaveLength(2);
      expect(results[0]!.uid).toBe('111');
      expect(results[1]!.uid).toBe('222');
    });

    it('respects retmax option', async () => {
      const variants = Array.from({ length: 10 }, (_, index) =>
        buildVariantReport({ uid: String(index) }),
      );
      const storage = buildMockStorage({
        searchRecords: vi.fn().mockResolvedValueOnce(variants).mockResolvedValueOnce([]),
      });
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.searchAndFetch('BRCA1', { retmax: 5 });
      expect(storage.searchRecords).toHaveBeenCalledWith('clinvar', {
        field: 'title',
        value: 'BRCA1',
        operator: 'contains',
        limit: 5,
      });
      expect(results).toHaveLength(5);
    });

    it('returns empty array when no matches found', async () => {
      const storage = buildMockStorage();
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.searchAndFetch('NONEXISTENT');
      expect(results).toHaveLength(0);
    });
  });

  describe('fetch', () => {
    it('fetches variant reports by UIDs from storage', async () => {
      const variant = buildVariantReport();
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValue(variant),
      });
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.fetch(['12345']);
      expect(storage.getRecord).toHaveBeenCalledWith('clinvar', '12345');
      expect(results).toHaveLength(1);
      expect(results[0]!.uid).toBe('12345');
    });

    it('fetches multiple variant reports', async () => {
      const variant1 = buildVariantReport({ uid: '111' });
      const variant2 = buildVariantReport({ uid: '222' });
      const storage = buildMockStorage({
        getRecord: vi.fn().mockResolvedValueOnce(variant1).mockResolvedValueOnce(variant2),
      });
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.fetch(['111', '222']);
      expect(results).toHaveLength(2);
    });

    it('skips missing records', async () => {
      const storage = buildMockStorage();
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.fetch(['99999']);
      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty IDs', async () => {
      const storage = buildMockStorage();
      const clinvar = ClinVar.fromStorage(storage);
      const results = await clinvar.fetch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('HTTP-only methods throw StorageModeError', () => {
    const storage = buildMockStorage();

    it('search throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.search('BRCA1')).rejects.toThrow(StorageModeError);
      await expect(clinvar.search('BRCA1')).rejects.toThrow(
        'search is not available in storage mode',
      );
    });

    it('refsnp throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.refsnp(12345)).rejects.toThrow(StorageModeError);
    });

    it('spdi throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.spdi('NC_000017.11:43044294:G:A')).rejects.toThrow(StorageModeError);
    });

    it('spdiToHgvs throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.spdiToHgvs('NC_000017.11:43044294:G:A')).rejects.toThrow(
        StorageModeError,
      );
    });

    it('hgvsToSpdi throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.hgvsToSpdi('NC_000017.11:g.43044295G>A')).rejects.toThrow(
        StorageModeError,
      );
    });

    it('frequency throws StorageModeError', async () => {
      const clinvar = ClinVar.fromStorage(storage);
      await expect(clinvar.frequency(12345)).rejects.toThrow(StorageModeError);
    });
  });
});
