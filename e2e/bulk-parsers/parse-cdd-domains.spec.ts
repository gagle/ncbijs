import { describe, expect, it } from 'vitest';
import { parseCddDomains } from '@ncbijs/cdd';
import { readFixture } from './fixture-reader';

describe('parseCddDomains (real data)', () => {
  const records = parseCddDomains(readFixture('cdd-sample.tsv'));

  it('should parse records from CDD domain list data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid accessions', () => {
    for (const record of records) {
      expect(record.accession.length).toBeGreaterThan(0);
    }
  });

  it('should have short names', () => {
    const first = records[0]!;

    expect(first.shortName.length).toBeGreaterThan(0);
  });

  it('should have descriptions', () => {
    const first = records[0]!;

    expect(first.description.length).toBeGreaterThan(0);
  });

  it('should have positive PSSM lengths', () => {
    for (const record of records) {
      expect(record.pssmLength).toBeGreaterThan(0);
    }
  });

  it('should have database names', () => {
    const databases = new Set(records.map((record) => record.database));

    expect(databases.size).toBeGreaterThan(0);
  });
});
