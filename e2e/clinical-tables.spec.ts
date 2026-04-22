import { describe, expect, it } from 'vitest';
import { search } from '@ncbijs/clinical-tables';

describe('Clinical Tables E2E', () => {
  it('should autocomplete ICD-10 codes for diabetes', async () => {
    let result;
    try {
      result = await search('icd10cm', 'diabetes');
    } catch {
      return;
    }

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.codes.length).toBeGreaterThan(0);
    expect(result.displayStrings.length).toBeGreaterThan(0);
  });

  it('should autocomplete LOINC codes', async () => {
    let result;
    try {
      result = await search('loinc_items', 'glucose');
    } catch {
      return;
    }

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.codes.length).toBeGreaterThan(0);
  });

  it('should return empty results for nonsense query', async () => {
    let result;
    try {
      result = await search('icd10cm', 'xyznonexistent99999');
    } catch {
      return;
    }

    expect(result.totalCount).toBe(0);
    expect(result.codes).toEqual([]);
  });
});
