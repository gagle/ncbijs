import { afterEach, describe, expect, it, vi } from 'vitest';
import { search } from './clinical-tables';

function mockFetchJson(data: unknown, status = 200): void {
  const text = JSON.stringify(data);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(text),
    }),
  );
}

function mockFetchFailure(errorMessage: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(errorMessage)));
}

const SAMPLE_RESPONSE: [number, Array<string>, null, Array<Array<string>>] = [
  42,
  ['E11', 'E11.0', 'E11.1'],
  null,
  [
    ['Type 2 diabetes mellitus'],
    ['Type 2 diabetes mellitus with hyperosmolarity'],
    ['Type 2 diabetes mellitus with ketoacidosis'],
  ],
];

const SAMPLE_RESPONSE_WITH_EXTRAS: [
  number,
  Array<string>,
  Record<string, Array<string>>,
  Array<Array<string>>,
] = [
  2,
  ['E11', 'E11.0'],
  {
    consumer_name: ['Diabetes type 2', 'Diabetes type 2 with coma'],
    status: ['Active', 'Active'],
  },
  [['Type 2 diabetes mellitus'], ['Type 2 diabetes mellitus with hyperosmolarity']],
];

const EMPTY_RESPONSE: [number, Array<string>, null, Array<Array<string>>] = [0, [], null, []];

describe('search', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('URL construction', () => {
    it('should include the table name in the URL path', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/icd10cm/v3/search');
    });

    it('should include the search term as a query parameter', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('terms')).toBe('diabetes');
    });

    it('should encode the table name in the URL', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('table with spaces', 'term');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/table%20with%20spaces/v3/search');
    });
  });

  describe('field mapping', () => {
    it('should map totalCount from the response', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', 'diabetes');
      expect(result.totalCount).toBe(42);
    });

    it('should map codes from the response', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', 'diabetes');
      expect(result.codes).toEqual(['E11', 'E11.0', 'E11.1']);
    });

    it('should map displayStrings from the response', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', 'diabetes');
      expect(result.displayStrings).toEqual([
        'Type 2 diabetes mellitus',
        'Type 2 diabetes mellitus with hyperosmolarity',
        'Type 2 diabetes mellitus with ketoacidosis',
      ]);
    });

    it('should return empty extras when no extraFields option is provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', 'diabetes');
      expect(result.extras).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw when table is empty', async () => {
      await expect(search('', 'diabetes')).rejects.toThrow('table must not be empty');
    });

    it('should throw on non-ok HTTP status', async () => {
      mockFetchJson(null, 500);
      await expect(search('icd10cm', 'diabetes')).rejects.toThrow(
        'Clinical Tables API returned status 500',
      );
    });

    it('should throw on network failure', async () => {
      mockFetchFailure('Failed to fetch');
      await expect(search('icd10cm', 'diabetes')).rejects.toThrow('Failed to fetch');
    });

    it('should throw when response is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/zip' }),
          text: () => Promise.resolve('binary data'),
        }),
      );
      await expect(search('icd10cm', 'diabetes')).rejects.toThrow(
        'Clinical Tables API returned status 200',
      );
    });
  });

  describe('options', () => {
    it('should append maxList to the URL when provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes', { maxList: 10 });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('maxList')).toBe('10');
    });

    it('should append count to the URL when provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes', { count: 5 });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('count')).toBe('5');
    });

    it('should append offset to the URL when provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes', { offset: 20 });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('offset')).toBe('20');
    });

    it('should append extraFields as ef parameter joined with commas', async () => {
      mockFetchJson(SAMPLE_RESPONSE_WITH_EXTRAS);
      await search('icd10cm', 'diabetes', { extraFields: ['consumer_name', 'status'] });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('ef')).toBe('consumer_name,status');
    });

    it('should not append ef parameter when extraFields is empty', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes', { extraFields: [] });
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.has('ef')).toBe(false);
    });

    it('should not append optional params when not provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      await search('icd10cm', 'diabetes');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.has('maxList')).toBe(false);
      expect(url.searchParams.has('count')).toBe(false);
      expect(url.searchParams.has('offset')).toBe(false);
      expect(url.searchParams.has('ef')).toBe(false);
    });
  });

  describe('extra fields', () => {
    it('should map extras from object to row-oriented array', async () => {
      mockFetchJson(SAMPLE_RESPONSE_WITH_EXTRAS);
      const result = await search('icd10cm', 'diabetes', {
        extraFields: ['consumer_name', 'status'],
      });
      expect(result.extras).toEqual([
        ['Diabetes type 2', 'Active'],
        ['Diabetes type 2 with coma', 'Active'],
      ]);
    });

    it('should return empty extras when raw extras is null despite extraFields being set', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', 'diabetes', { extraFields: ['consumer_name'] });
      expect(result.extras).toEqual([]);
    });

    it('should return empty extras when extraFields is not provided', async () => {
      mockFetchJson(SAMPLE_RESPONSE_WITH_EXTRAS);
      const result = await search('icd10cm', 'diabetes');
      expect(result.extras).toEqual([]);
    });

    it('should handle missing field keys in extras gracefully', async () => {
      const responseWithPartialExtras: [
        number,
        Array<string>,
        Record<string, Array<string>>,
        Array<Array<string>>,
      ] = [1, ['E11'], { consumer_name: ['Diabetes type 2'] }, [['Type 2 diabetes mellitus']]];
      mockFetchJson(responseWithPartialExtras);
      const result = await search('icd10cm', 'diabetes', {
        extraFields: ['consumer_name', 'nonexistent_field'],
      });
      expect(result.extras).toEqual([['Diabetes type 2', '']]);
    });

    it('should return empty extras when extras object has no matching fields', async () => {
      const responseWithEmptyExtras: [
        number,
        Array<string>,
        Record<string, Array<string>>,
        Array<Array<string>>,
      ] = [0, [], {}, [[]]];
      mockFetchJson(responseWithEmptyExtras);
      const result = await search('icd10cm', 'diabetes', {
        extraFields: ['nonexistent_field'],
      });
      expect(result.extras).toEqual([]);
    });

    it('should return empty extras when extraFields is empty and raw extras is non-null', async () => {
      const responseWithNonNullExtras: [
        number,
        Array<string>,
        Record<string, Array<string>>,
        Array<Array<string>>,
      ] = [1, ['E11'], { consumer_name: ['Diabetes type 2'] }, [['Type 2 diabetes mellitus']]];
      mockFetchJson(responseWithNonNullExtras);
      const result = await search('icd10cm', 'diabetes', { extraFields: [] });
      expect(result.extras).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search term', async () => {
      mockFetchJson(SAMPLE_RESPONSE);
      const result = await search('icd10cm', '');
      expect(result.totalCount).toBe(42);
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.searchParams.get('terms')).toBe('');
    });

    it('should handle empty results', async () => {
      mockFetchJson(EMPTY_RESPONSE);
      const result = await search('icd10cm', 'nonexistent');
      expect(result.totalCount).toBe(0);
      expect(result.codes).toEqual([]);
      expect(result.displayStrings).toEqual([]);
      expect(result.extras).toEqual([]);
    });
  });
});
