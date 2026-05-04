import { describe, expect, it } from 'vitest';
import { parseMedGenRrf } from '@ncbijs/medgen';
import { readFixture } from './fixture-reader';

describe('parseMedGenRrf (real data)', () => {
  const records = parseMedGenRrf({
    mgconso: readFixture('mgconso-sample.rrf'),
    mgdef: readFixture('mgdef-sample.rrf'),
    mgsty: readFixture('mgsty-sample.rrf'),
  });

  it('should parse records from real MedGen RRF data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have valid concept IDs', () => {
    const first = records[0]!;

    expect(first.conceptId.length).toBeGreaterThan(0);
    expect(first.uid).toBe(first.conceptId);
  });

  it('should have titles', () => {
    const first = records[0]!;

    expect(first.title.length).toBeGreaterThan(0);
  });

  it('should have names from MGCONSO', () => {
    const first = records[0]!;

    expect(first.names.length).toBeGreaterThan(0);
    expect(first.names[0]!.name.length).toBeGreaterThan(0);
  });

  it('should have definitions from MGDEF', () => {
    const withDef = records.find((record) => record.definition.length > 0);

    expect(withDef).toBeDefined();
  });

  it('should have semantic types from MGSTY', () => {
    const withType = records.find((record) => record.semanticType.length > 0);

    expect(withType).toBeDefined();
  });
});
