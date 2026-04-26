import { describe, expect, it } from 'vitest';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';
import { readFixture } from './fixture-reader';

describe('parsePmcIdsCsv (real data)', () => {
  const records = parsePmcIdsCsv(readFixture('pmc-ids.csv'));

  it('should parse records from real PMC ID mapping data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have PMC IDs', () => {
    const withPmcid = records.find((record) => record.pmcid !== null);

    expect(withPmcid).toBeDefined();
    expect(withPmcid!.pmcid).toMatch(/^PMC\d+$/);
  });

  it('should have PubMed IDs', () => {
    const withPmid = records.find((record) => record.pmid !== null);

    expect(withPmid).toBeDefined();
    expect(withPmid!.pmid).toMatch(/^\d+$/);
  });

  it('should have DOIs', () => {
    const withDoi = records.find((record) => record.doi !== null);

    expect(withDoi).toBeDefined();
    expect(withDoi!.doi!.length).toBeGreaterThan(0);
  });

  it('should have manuscript IDs on some records', () => {
    const withMid = records.find((record) => record.mid !== undefined);

    expect(withMid).toBeDefined();
    expect(withMid!.mid!.length).toBeGreaterThan(0);
  });
});
