import { describe, expect, it } from 'vitest';
import { PubChem } from '@ncbijs/pubchem';

const pubchem = new PubChem();

describe('PubChem PUG REST E2E', () => {
  it('should retrieve aspirin by CID', async () => {
    const compound = await pubchem.compoundByCid(2244);

    expect(compound.cid).toBe(2244);
    expect(compound.molecularFormula).toBe('C9H8O4');
    expect(compound.molecularWeight).toBeCloseTo(180.16, 1);
    expect(compound.iupacName).toBeTruthy();
    expect(compound.canonicalSmiles).toBeTruthy();
    expect(compound.inchiKey).toBeTruthy();
  });

  it('should retrieve aspirin by name', async () => {
    const compound = await pubchem.compoundByName('aspirin');

    expect(compound.cid).toBe(2244);
    expect(compound.molecularFormula).toBe('C9H8O4');
  });

  it('should get synonyms for aspirin', async () => {
    const synonyms = await pubchem.synonyms(2244);

    expect(synonyms.cid).toBe(2244);
    expect(synonyms.synonyms.length).toBeGreaterThan(0);
    expect(synonyms.synonyms.some((s) => s.toLowerCase().includes('aspirin'))).toBe(true);
  });

  it('should get description for aspirin', async () => {
    const description = await pubchem.description(2244);

    expect(description.cid).toBe(2244);
    expect(description.title).toBeTruthy();
  });
});
