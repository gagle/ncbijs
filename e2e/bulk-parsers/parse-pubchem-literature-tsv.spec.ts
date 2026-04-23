import { describe, expect, it } from 'vitest';
import { parsePubchemLiteratureTsv } from '@ncbijs/pubchem';
import { readFixture } from './fixture-reader';

describe('parsePubchemLiteratureTsv (real data)', () => {
  const records = parsePubchemLiteratureTsv(readFixture('cid-pmid-sample.tsv'));

  it('should parse records from real PubChem CID-PMID data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid CIDs', () => {
    for (const record of records) {
      expect(record.cid).toBeGreaterThan(0);
    }
  });

  it('should have valid PMIDs', () => {
    for (const record of records) {
      expect(record.pmid).toBeGreaterThan(0);
    }
  });

  it('should have a type field', () => {
    for (const record of records) {
      expect(typeof record.type).toBe('string');
    }
  });
});
