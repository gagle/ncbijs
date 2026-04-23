import { describe, expect, it } from 'vitest';
import { parseTaxonomyDump } from '@ncbijs/datasets';
import { readFixture } from './fixture-reader';

describe('parseTaxonomyDump (real data)', () => {
  const records = parseTaxonomyDump({
    namesDmp: readFixture('names.dmp'),
    nodesDmp: readFixture('nodes.dmp'),
  });

  it('should parse taxonomy records', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should find Homo sapiens (taxId 9606)', () => {
    const human = records.find((record) => record.taxId === 9606);

    expect(human).toBeDefined();
    expect(human!.organismName).toBe('Homo sapiens');
    expect(human!.commonName).toBe('human');
    expect(human!.rank).toBe('species');
  });

  it('should have lineage for species', () => {
    const human = records.find((record) => record.taxId === 9606);

    expect(human).toBeDefined();
    expect(human!.lineage.length).toBeGreaterThan(0);
  });

  it('should have children for higher-rank nodes', () => {
    const mammalia = records.find((record) => record.taxId === 40674);

    expect(mammalia).toBeDefined();
    expect(mammalia!.organismName).toBe('Mammalia');
    expect(mammalia!.rank).toBe('class');
    expect(mammalia!.children.length).toBeGreaterThan(0);
  });

  it('should have ranks for all records', () => {
    for (const record of records) {
      expect(record.rank.length).toBeGreaterThan(0);
    }
  });
});
