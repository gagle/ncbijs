import { describe, expect, it } from 'vitest';
import { parseCompoundExtras } from '@ncbijs/pubchem';
import { readFixture } from './fixture-reader';

describe('parseCompoundExtras (real data)', () => {
  const records = parseCompoundExtras({
    cidSmiles: readFixture('cid-smiles.tsv'),
    cidInchiKey: readFixture('cid-inchi-key.tsv'),
    cidIupac: readFixture('cid-iupac.tsv'),
  });

  it('should parse compound records from real PubChem data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have numeric CID', () => {
    const first = records[0]!;

    expect(first.cid).toBeGreaterThan(0);
  });

  it('should have SMILES notation', () => {
    const withSmiles = records.find((record) => record.canonicalSmiles.length > 0);

    expect(withSmiles).toBeDefined();
  });

  it('should have InChI keys', () => {
    const withInchiKey = records.find((record) => record.inchiKey.length > 0);

    expect(withInchiKey).toBeDefined();
    expect(withInchiKey!.inchiKey).toContain('InChI=');
  });

  it('should have IUPAC names', () => {
    const withIupac = records.find((record) => record.iupacName.length > 0);

    expect(withIupac).toBeDefined();
  });
});
