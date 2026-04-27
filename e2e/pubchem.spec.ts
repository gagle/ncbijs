import { describe, expect, it } from 'vitest';
import { PubChem } from '@ncbijs/pubchem';

const pubchem = new PubChem({ maxRetries: 5 });

describe('PubChem PUG REST E2E', () => {
  it('should retrieve aspirin by CID', async () => {
    const compound = await pubchem.compoundByCid(2244);

    expect(compound.cid).toBe(2244);
    expect(compound.molecularFormula).toBe('C9H8O4');
    expect(compound.molecularWeight).toBeCloseTo(180.16, 1);
    expect(compound.canonicalSmiles).toBeTruthy();
    expect(compound.inchiKey).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');
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

  it('should retrieve substance by SID', async () => {
    try {
      const substance = await pubchem.substanceBySid(175);

      expect(substance.sid).toBe(175);
      expect(substance.sourceName).toBeTruthy();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('status 501')) {
        return;
      }
      throw error;
    }
  });

  it('should retrieve substance synonyms', async () => {
    try {
      const synonyms = await pubchem.substanceSynonyms(175);

      expect(synonyms.sid).toBe(175);
      expect(synonyms.synonyms.length).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('status 501')) {
        return;
      }
      throw error;
    }
  });

  it('should find SIDs by name', async () => {
    try {
      const sids = await pubchem.sidsByName('aspirin');

      expect(sids.length).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('status 501')) {
        return;
      }
      throw error;
    }
  });

  it('should retrieve assay description by AID', async () => {
    try {
      const assay = await pubchem.assayByAid(1000);

      expect(assay.aid).toBe(1000);
      expect(assay.name).toBeTruthy();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('status 503')) {
        return;
      }
      throw error;
    }
  });

  it('should retrieve assay summary', async () => {
    try {
      const summary = await pubchem.assaySummary(1000);

      expect(summary.aid).toBe(1000);
      expect(summary.sidCount).toBeGreaterThan(0);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('status 503')) {
        return;
      }
      throw error;
    }
  });
});
