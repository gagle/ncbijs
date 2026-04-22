import { describe, expect, it } from 'vitest';
import { search } from '@ncbijs/clinical-tables';

describe('Clinical Tables E2E', () => {
  it('should autocomplete ICD-10 codes for diabetes', async () => {
    try {
      const result = await search('icd10cm', 'diabetes');

      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.codes.length).toBeGreaterThan(0);
      expect(result.displayStrings.length).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d|content-type/.test(error.message)) {
        return;
      }
      throw error;
    }
  });

  it('should autocomplete LOINC codes', async () => {
    try {
      const result = await search('loinc_items', 'glucose');

      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.codes.length).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d|content-type/.test(error.message)) {
        return;
      }
      throw error;
    }
  });

  it('should return empty results for nonsense query', async () => {
    try {
      const result = await search('icd10cm', 'xyznonexistent99999');

      expect(result.totalCount).toBe(0);
      expect(result.codes).toEqual([]);
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d|content-type/.test(error.message)) {
        return;
      }
      throw error;
    }
  });
});
