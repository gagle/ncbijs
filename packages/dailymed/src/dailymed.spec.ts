import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyMed } from './dailymed';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function buildMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    total_elements: 10,
    total_pages: 2,
    current_page: 1,
    elements_per_page: 5,
    ...overrides,
  };
}

describe('DailyMed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('drugNames', () => {
    it('should return drug names with pagination', async () => {
      mockFetchJson({
        data: [
          { drug_name: 'ASPIRIN 81 MG', name_type: 'B' },
          { drug_name: 'ASPIRIN 325 MG', name_type: 'G' },
        ],
        metadata: buildMetadata(),
      });
      const dm = new DailyMed();

      const result = await dm.drugNames('aspirin');

      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.drugName).toBe('ASPIRIN 81 MG');
      expect(result.data[0]!.nameType).toBe('B');
      expect(result.data[1]!.drugName).toBe('ASPIRIN 325 MG');
      expect(result.data[1]!.nameType).toBe('G');
      expect(result.pagination.totalElements).toBe(10);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.elementsPerPage).toBe(5);
    });

    it('should build correct URL with drug name', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.drugNames('aspirin');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('drugnames.json');
      expect(url).toContain('drug_name=aspirin');
    });

    it('should include page and pagesize when specified', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.drugNames('aspirin', { page: 2, pageSize: 25 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('pagesize=25');
    });

    it('should handle missing data array', async () => {
      mockFetchJson({ metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.drugNames('unknown');

      expect(result.data).toEqual([]);
    });

    it('should handle missing metadata', async () => {
      mockFetchJson({ data: [] });
      const dm = new DailyMed();

      const result = await dm.drugNames('unknown');

      expect(result.pagination.totalElements).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.currentPage).toBe(0);
      expect(result.pagination.elementsPerPage).toBe(0);
    });

    it('should default missing entry fields', async () => {
      mockFetchJson({ data: [{}], metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.drugNames('test');

      expect(result.data[0]!.drugName).toBe('');
      expect(result.data[0]!.nameType).toBe('');
    });
  });

  describe('spls', () => {
    it('should return SPL summaries with pagination', async () => {
      mockFetchJson({
        data: [
          {
            setid: 'b63ed64c-7f59-4ed3-ba63-2e3c4b04cf0a',
            title: 'ASPIRIN 325mg tablet',
            published_date: 'Apr 20, 2026',
            spl_version: 3,
          },
        ],
        metadata: buildMetadata({ total_elements: 1071 }),
      });
      const dm = new DailyMed();

      const result = await dm.spls('aspirin');

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.setId).toBe('b63ed64c-7f59-4ed3-ba63-2e3c4b04cf0a');
      expect(result.data[0]!.title).toBe('ASPIRIN 325mg tablet');
      expect(result.data[0]!.publishedDate).toBe('Apr 20, 2026');
      expect(result.data[0]!.splVersion).toBe(3);
      expect(result.pagination.totalElements).toBe(1071);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.spls('ibuprofen', { page: 1, pageSize: 10 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('spls.json');
      expect(url).toContain('drug_name=ibuprofen');
      expect(url).toContain('page=1');
      expect(url).toContain('pagesize=10');
    });

    it('should handle missing data array', async () => {
      mockFetchJson({ metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.spls('unknown');

      expect(result.data).toEqual([]);
    });

    it('should default missing entry fields', async () => {
      mockFetchJson({ data: [{}], metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.spls('test');

      expect(result.data[0]!.setId).toBe('');
      expect(result.data[0]!.title).toBe('');
      expect(result.data[0]!.publishedDate).toBe('');
      expect(result.data[0]!.splVersion).toBe(0);
    });
  });

  describe('ndcs', () => {
    it('should return NDC codes with pagination', async () => {
      mockFetchJson({
        data: [{ ndc: '00904-6981-61' }, { ndc: '00904-6981-80' }],
        metadata: buildMetadata({ total_elements: 406473 }),
      });
      const dm = new DailyMed();

      const result = await dm.ndcs('aspirin');

      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.ndc).toBe('00904-6981-61');
      expect(result.data[1]!.ndc).toBe('00904-6981-80');
      expect(result.pagination.totalElements).toBe(406473);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.ndcs('aspirin');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('ndcs.json');
      expect(url).toContain('drug_name=aspirin');
    });

    it('should handle missing data array', async () => {
      mockFetchJson({ metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.ndcs('unknown');

      expect(result.data).toEqual([]);
    });

    it('should default missing ndc field', async () => {
      mockFetchJson({ data: [{}], metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.ndcs('test');

      expect(result.data[0]!.ndc).toBe('');
    });
  });

  describe('drugClasses', () => {
    it('should return drug classes with pagination', async () => {
      mockFetchJson({
        data: [
          {
            code: 'N0000175809',
            codingSystem: '2.16.840.1.113883.6.345',
            type: 'EPC',
            name: 'Platelet Aggregation Inhibitor',
          },
        ],
        metadata: buildMetadata({ total_elements: 1216 }),
      });
      const dm = new DailyMed();

      const result = await dm.drugClasses();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.code).toBe('N0000175809');
      expect(result.data[0]!.codingSystem).toBe('2.16.840.1.113883.6.345');
      expect(result.data[0]!.classType).toBe('EPC');
      expect(result.data[0]!.name).toBe('Platelet Aggregation Inhibitor');
      expect(result.pagination.totalElements).toBe(1216);
    });

    it('should build correct URL without options', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.drugClasses();

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://dailymed.nlm.nih.gov/dailymed/services/v2/drugclasses.json');
    });

    it('should build correct URL with pagination', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.drugClasses({ page: 3, pageSize: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('drugclasses.json');
      expect(url).toContain('page=3');
      expect(url).toContain('pagesize=50');
    });

    it('should handle missing data array', async () => {
      mockFetchJson({ metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.drugClasses();

      expect(result.data).toEqual([]);
    });

    it('should default missing entry fields', async () => {
      mockFetchJson({ data: [{}], metadata: buildMetadata() });
      const dm = new DailyMed();

      const result = await dm.drugClasses();

      expect(result.data[0]!.code).toBe('');
      expect(result.data[0]!.codingSystem).toBe('');
      expect(result.data[0]!.classType).toBe('');
      expect(result.data[0]!.name).toBe('');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed();

      await dm.drugNames('aspirin');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries', async () => {
      mockFetchJson({ data: [], metadata: buildMetadata() });
      const dm = new DailyMed({ maxRetries: 5 });

      await dm.drugNames('aspirin');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
