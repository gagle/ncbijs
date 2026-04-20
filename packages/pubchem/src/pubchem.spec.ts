import { afterEach, describe, expect, it, vi } from 'vitest';
import { PubChem } from './pubchem';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchError(status: number, body: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: () => Promise.resolve(body),
    }),
  );
}

function buildPropertyResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    PropertyTable: {
      Properties: [
        {
          CID: 2244,
          MolecularFormula: 'C9H8O4',
          MolecularWeight: 180.16,
          IUPACName: '2-acetyloxybenzoic acid',
          CanonicalSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O',
          IsomericSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O',
          InChI: 'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
          InChIKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
          XLogP: 1.2,
          ExactMass: 180.042259,
          MonoisotopicMass: 180.042259,
          TPSA: 63.6,
          Complexity: 212,
          HBondDonorCount: 1,
          HBondAcceptorCount: 4,
          RotatableBondCount: 3,
          HeavyAtomCount: 13,
          ...overrides,
        },
      ],
    },
  };
}

function buildSynonymsResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    InformationList: {
      Information: [
        {
          CID: 2244,
          Synonym: ['aspirin', 'Acetylsalicylic acid', '50-78-2'],
          ...overrides,
        },
      ],
    },
  };
}

function buildDescriptionResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    InformationList: {
      Information: [
        {
          CID: 2244,
          Title: 'Aspirin',
          Description: 'Aspirin is a member of the class of benzoic acids.',
          ...overrides,
        },
      ],
    },
  };
}

describe('PubChem', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('compoundByCid', () => {
    it('should fetch compound by CID and map all fields', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(2244);

      expect(compound.cid).toBe(2244);
      expect(compound.molecularFormula).toBe('C9H8O4');
      expect(compound.molecularWeight).toBe(180.16);
      expect(compound.iupacName).toBe('2-acetyloxybenzoic acid');
      expect(compound.canonicalSmiles).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
      expect(compound.isomericSmiles).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
      expect(compound.inchi).toBe(
        'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
      );
      expect(compound.inchiKey).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');
      expect(compound.xLogP).toBe(1.2);
      expect(compound.exactMass).toBe(180.042259);
      expect(compound.monoisotopicMass).toBe(180.042259);
      expect(compound.tpsa).toBe(63.6);
      expect(compound.complexity).toBe(212);
      expect(compound.hBondDonorCount).toBe(1);
      expect(compound.hBondAcceptorCount).toBe(4);
      expect(compound.rotatableBondCount).toBe(3);
      expect(compound.heavyAtomCount).toBe(13);
    });

    it('should build correct URL with CID', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundByCid(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/cid/2244/property/');
      expect(url).toContain('MolecularFormula');
      expect(url).toContain('HeavyAtomCount');
      expect(url).toMatch(/\/JSON$/);
    });

    it('should handle missing optional fields gracefully', async () => {
      mockFetchJson({ PropertyTable: { Properties: [{ CID: 1 }] } });
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(1);

      expect(compound.cid).toBe(1);
      expect(compound.molecularFormula).toBe('');
      expect(compound.molecularWeight).toBe(0);
      expect(compound.iupacName).toBe('');
      expect(compound.canonicalSmiles).toBe('');
      expect(compound.isomericSmiles).toBe('');
      expect(compound.inchi).toBe('');
      expect(compound.inchiKey).toBe('');
      expect(compound.xLogP).toBe(0);
      expect(compound.exactMass).toBe(0);
      expect(compound.monoisotopicMass).toBe(0);
      expect(compound.tpsa).toBe(0);
      expect(compound.complexity).toBe(0);
      expect(compound.hBondDonorCount).toBe(0);
      expect(compound.hBondAcceptorCount).toBe(0);
      expect(compound.rotatableBondCount).toBe(0);
      expect(compound.heavyAtomCount).toBe(0);
    });

    it('should handle empty PropertyTable', async () => {
      mockFetchJson({ PropertyTable: {} });
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(1);

      expect(compound.cid).toBe(0);
      expect(compound.molecularFormula).toBe('');
    });

    it('should handle missing PropertyTable', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(1);

      expect(compound.cid).toBe(0);
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundByCid(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundByName', () => {
    it('should fetch compound by name and map fields', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByName('aspirin');

      expect(compound.cid).toBe(2244);
      expect(compound.molecularFormula).toBe('C9H8O4');
      expect(compound.iupacName).toBe('2-acetyloxybenzoic acid');
    });

    it('should build correct URL with encoded name', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundByName('acetylsalicylic acid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/name/acetylsalicylic%20acid/property/');
    });

    it('should throw on 404 for unknown compound name', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundByName('notarealcompound')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('synonyms', () => {
    it('should fetch synonyms and map fields', async () => {
      mockFetchJson(buildSynonymsResponse());
      const pubchem = new PubChem();

      const result = await pubchem.synonyms(2244);

      expect(result.cid).toBe(2244);
      expect(result.synonyms).toEqual(['aspirin', 'Acetylsalicylic acid', '50-78-2']);
    });

    it('should build correct URL', async () => {
      mockFetchJson(buildSynonymsResponse());
      const pubchem = new PubChem();

      await pubchem.synonyms(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/cid/2244/synonyms/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const result = await pubchem.synonyms(1);

      expect(result.cid).toBe(0);
      expect(result.synonyms).toEqual([]);
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const result = await pubchem.synonyms(1);

      expect(result.cid).toBe(0);
      expect(result.synonyms).toEqual([]);
    });

    it('should handle Information entry with missing Synonym', async () => {
      mockFetchJson({ InformationList: { Information: [{ CID: 5 }] } });
      const pubchem = new PubChem();

      const result = await pubchem.synonyms(5);

      expect(result.cid).toBe(5);
      expect(result.synonyms).toEqual([]);
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.synonyms(999999999)).rejects.toThrow('PubChem API returned status 404');
    });
  });

  describe('description', () => {
    it('should fetch description and map fields', async () => {
      mockFetchJson(buildDescriptionResponse());
      const pubchem = new PubChem();

      const result = await pubchem.description(2244);

      expect(result.cid).toBe(2244);
      expect(result.title).toBe('Aspirin');
      expect(result.description).toBe('Aspirin is a member of the class of benzoic acids.');
    });

    it('should build correct URL', async () => {
      mockFetchJson(buildDescriptionResponse());
      const pubchem = new PubChem();

      await pubchem.description(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/cid/2244/description/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const result = await pubchem.description(1);

      expect(result.cid).toBe(0);
      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const result = await pubchem.description(1);

      expect(result.cid).toBe(0);
      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle Information entry with missing fields', async () => {
      mockFetchJson({ InformationList: { Information: [{ CID: 5 }] } });
      const pubchem = new PubChem();

      const result = await pubchem.description(5);

      expect(result.cid).toBe(5);
      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.description(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundByCidBatch', () => {
    it('should fetch multiple compounds and map all entries', async () => {
      mockFetchJson({
        PropertyTable: {
          Properties: [
            { CID: 2244, MolecularFormula: 'C9H8O4', MolecularWeight: 180.16 },
            { CID: 2519, MolecularFormula: 'C8H10N4O2', MolecularWeight: 194.19 },
          ],
        },
      });
      const pubchem = new PubChem();

      const compounds = await pubchem.compoundByCidBatch([2244, 2519]);

      expect(compounds).toHaveLength(2);
      expect(compounds[0]!.cid).toBe(2244);
      expect(compounds[0]!.molecularFormula).toBe('C9H8O4');
      expect(compounds[1]!.cid).toBe(2519);
      expect(compounds[1]!.molecularFormula).toBe('C8H10N4O2');
    });

    it('should build correct URL with comma-separated CIDs', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundByCidBatch([2244, 2519]);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/cid/2244%2C2519/property/');
    });

    it('should return empty array for empty CIDs', async () => {
      const pubchem = new PubChem();

      const compounds = await pubchem.compoundByCidBatch([]);

      expect(compounds).toEqual([]);
    });

    it('should handle empty PropertyTable', async () => {
      mockFetchJson({ PropertyTable: {} });
      const pubchem = new PubChem();

      const compounds = await pubchem.compoundByCidBatch([2244]);

      expect(compounds).toEqual([]);
    });

    it('should handle missing PropertyTable', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const compounds = await pubchem.compoundByCidBatch([2244]);

      expect(compounds).toEqual([]);
    });
  });

  describe('compoundBySmiles', () => {
    it('should fetch compound by SMILES and map fields', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      const compound = await pubchem.compoundBySmiles('CC(=O)OC1=CC=CC=C1C(=O)O');

      expect(compound.cid).toBe(2244);
      expect(compound.molecularFormula).toBe('C9H8O4');
    });

    it('should build correct URL with encoded SMILES', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundBySmiles('CC(=O)OC1=CC=CC=C1C(=O)O');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/smiles/CC(%3D');
      expect(url).toContain('/property/');
    });

    it('should throw on 404 for unknown SMILES', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundBySmiles('INVALID')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundByInchiKey', () => {
    it('should fetch compound by InChIKey and map fields', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByInchiKey('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');

      expect(compound.cid).toBe(2244);
      expect(compound.molecularFormula).toBe('C9H8O4');
    });

    it('should build correct URL with InChIKey', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundByInchiKey('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/inchikey/BSYNRYMUTXBXSQ-UHFFFAOYSA-N/property/');
    });

    it('should throw on 404 for unknown InChIKey', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundByInchiKey('INVALID')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('cidsByName', () => {
    it('should return CIDs for a compound name', async () => {
      mockFetchJson({ IdentifierList: { CID: [2244] } });
      const pubchem = new PubChem();

      const cids = await pubchem.cidsByName('aspirin');

      expect(cids).toEqual([2244]);
    });

    it('should return multiple CIDs when available', async () => {
      mockFetchJson({ IdentifierList: { CID: [2244, 71364] } });
      const pubchem = new PubChem();

      const cids = await pubchem.cidsByName('aspirin');

      expect(cids).toEqual([2244, 71364]);
    });

    it('should build correct URL with encoded name', async () => {
      mockFetchJson({ IdentifierList: { CID: [2244] } });
      const pubchem = new PubChem();

      await pubchem.cidsByName('acetylsalicylic acid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/name/acetylsalicylic%20acid/cids/JSON');
    });

    it('should handle missing IdentifierList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const cids = await pubchem.cidsByName('unknown');

      expect(cids).toEqual([]);
    });

    it('should handle missing CID array', async () => {
      mockFetchJson({ IdentifierList: {} });
      const pubchem = new PubChem();

      const cids = await pubchem.cidsByName('unknown');

      expect(cids).toEqual([]);
    });

    it('should throw on 404 for unknown compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.cidsByName('notarealcompound')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem();

      await pubchem.compoundByCid(2244);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries', async () => {
      mockFetchJson(buildPropertyResponse());
      const pubchem = new PubChem({ maxRetries: 5 });

      await pubchem.compoundByCid(2244);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
