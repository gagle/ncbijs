import { describe, expect, it } from 'vitest';
import { parseClinicalTrialJson } from '@ncbijs/clinical-trials';
import { readFixture } from './fixture-reader';

describe('parseClinicalTrialJson (real data)', () => {
  const records = parseClinicalTrialJson(readFixture('clinical-trials-sample.json'));

  it('should parse records from real ClinicalTrials.gov API data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid NCT IDs', () => {
    for (const record of records) {
      expect(record.nctId).toMatch(/^NCT\d+$/);
    }
  });

  it('should have study metadata', () => {
    const first = records[0]!;

    expect(first.briefTitle.length).toBeGreaterThan(0);
    expect(typeof first.overallStatus).toBe('string');
    expect(typeof first.studyType).toBe('string');
  });

  it('should have conditions as an array', () => {
    const first = records[0]!;

    expect(Array.isArray(first.conditions)).toBe(true);
  });

  it('should have sponsors as an array', () => {
    const first = records[0]!;

    expect(Array.isArray(first.sponsors)).toBe(true);
  });
});
