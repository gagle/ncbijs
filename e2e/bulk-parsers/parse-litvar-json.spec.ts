import { describe, expect, it } from 'vitest';
import { parseLitVarJson } from '@ncbijs/litvar';
import { readFixture } from './fixture-reader';

describe('parseLitVarJson (real data)', () => {
  const records = parseLitVarJson(readFixture('litvar-sample.json'));

  it('should parse records from LitVar JSON data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid RS IDs', () => {
    for (const record of records) {
      expect(record.rsid).toMatch(/^rs\d+$/);
    }
  });

  it('should have HGVS notation', () => {
    const first = records[0]!;

    expect(first.hgvs.length).toBeGreaterThan(0);
  });

  it('should have gene symbols', () => {
    const first = records[0]!;

    expect(first.gene.length).toBeGreaterThan(0);
  });
});
