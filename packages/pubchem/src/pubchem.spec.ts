import { afterEach, describe, expect, it, vi } from 'vitest';
import { PubChem } from './pubchem';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      headers: new Headers({ 'content-type': 'application/json' }),
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

    it('should map ConnectivitySMILES when CanonicalSMILES is absent', async () => {
      mockFetchJson({
        PropertyTable: {
          Properties: [
            {
              CID: 2244,
              ConnectivitySMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O',
              MolecularFormula: 'C9H8O4',
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(2244);
      expect(compound.canonicalSmiles).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
      expect(compound.isomericSmiles).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
    });

    it('should coerce string MolecularWeight and ExactMass to numbers', async () => {
      mockFetchJson({
        PropertyTable: {
          Properties: [
            {
              CID: 2244,
              MolecularWeight: '180.16',
              ExactMass: '180.04225873',
              MonoisotopicMass: '180.04225873',
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const compound = await pubchem.compoundByCid(2244);
      expect(compound.molecularWeight).toBe(180.16);
      expect(compound.exactMass).toBeCloseTo(180.042259, 4);
      expect(compound.monoisotopicMass).toBeCloseTo(180.042259, 4);
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

  describe('substanceBySid', () => {
    it('should fetch substance by SID and map fields', async () => {
      mockFetchJson({
        InformationList: {
          Information: [
            {
              SID: 175,
              SourceName: 'DTP/NCI',
              SourceID: '729456',
              Description: 'A benzoic acid derivative.',
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const substance = await pubchem.substanceBySid(175);

      expect(substance.sid).toBe(175);
      expect(substance.sourceName).toBe('DTP/NCI');
      expect(substance.sourceId).toBe('729456');
      expect(substance.description).toBe('A benzoic acid derivative.');
    });

    it('should build correct URL with SID', async () => {
      mockFetchJson({ InformationList: { Information: [{ SID: 175 }] } });
      const pubchem = new PubChem();

      await pubchem.substanceBySid(175);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/substance/sid/175/description/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const substance = await pubchem.substanceBySid(1);

      expect(substance.sid).toBe(0);
      expect(substance.sourceName).toBe('');
      expect(substance.sourceId).toBe('');
      expect(substance.description).toBe('');
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const substance = await pubchem.substanceBySid(1);

      expect(substance.sid).toBe(0);
    });

    it('should throw on 404 for non-existent substance', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.substanceBySid(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('substanceBySidBatch', () => {
    it('should fetch multiple substances and map all entries', async () => {
      mockFetchJson({
        InformationList: {
          Information: [
            { SID: 175, SourceName: 'DTP/NCI', SourceID: '729456', Description: 'Substance 1' },
            { SID: 176, SourceName: 'ChEBI', SourceID: '15365', Description: 'Substance 2' },
          ],
        },
      });
      const pubchem = new PubChem();

      const substances = await pubchem.substanceBySidBatch([175, 176]);

      expect(substances).toHaveLength(2);
      expect(substances[0]!.sid).toBe(175);
      expect(substances[0]!.sourceName).toBe('DTP/NCI');
      expect(substances[1]!.sid).toBe(176);
      expect(substances[1]!.sourceName).toBe('ChEBI');
    });

    it('should build correct URL with comma-separated SIDs', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      await pubchem.substanceBySidBatch([175, 176]);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/substance/sid/175%2C176/description/JSON');
    });

    it('should return empty array for empty SIDs', async () => {
      const pubchem = new PubChem();

      const substances = await pubchem.substanceBySidBatch([]);

      expect(substances).toEqual([]);
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const substances = await pubchem.substanceBySidBatch([175]);

      expect(substances).toEqual([]);
    });
  });

  describe('substanceByName', () => {
    it('should fetch substance by name and map fields', async () => {
      mockFetchJson({
        InformationList: {
          Information: [
            {
              SID: 175,
              SourceName: 'DTP/NCI',
              SourceID: '729456',
              Description: 'Aspirin substance',
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const substance = await pubchem.substanceByName('aspirin');

      expect(substance.sid).toBe(175);
      expect(substance.sourceName).toBe('DTP/NCI');
    });

    it('should build correct URL with encoded name', async () => {
      mockFetchJson({ InformationList: { Information: [{ SID: 1 }] } });
      const pubchem = new PubChem();

      await pubchem.substanceByName('acetylsalicylic acid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/substance/name/acetylsalicylic%20acid/description/JSON');
    });

    it('should throw on 404 for unknown substance', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.substanceByName('notarealsubstance')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('substanceSynonyms', () => {
    it('should fetch substance synonyms and map fields', async () => {
      mockFetchJson({
        InformationList: {
          Information: [{ SID: 175, Synonym: ['aspirin', 'Acetylsalicylic acid'] }],
        },
      });
      const pubchem = new PubChem();

      const result = await pubchem.substanceSynonyms(175);

      expect(result.sid).toBe(175);
      expect(result.synonyms).toEqual(['aspirin', 'Acetylsalicylic acid']);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ InformationList: { Information: [{ SID: 175 }] } });
      const pubchem = new PubChem();

      await pubchem.substanceSynonyms(175);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/substance/sid/175/synonyms/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const result = await pubchem.substanceSynonyms(1);

      expect(result.sid).toBe(0);
      expect(result.synonyms).toEqual([]);
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const result = await pubchem.substanceSynonyms(1);

      expect(result.sid).toBe(0);
      expect(result.synonyms).toEqual([]);
    });

    it('should handle Information entry with missing Synonym', async () => {
      mockFetchJson({ InformationList: { Information: [{ SID: 5 }] } });
      const pubchem = new PubChem();

      const result = await pubchem.substanceSynonyms(5);

      expect(result.sid).toBe(5);
      expect(result.synonyms).toEqual([]);
    });
  });

  describe('sidsByName', () => {
    it('should return SIDs for a substance name', async () => {
      mockFetchJson({ IdentifierList: { SID: [175, 344234] } });
      const pubchem = new PubChem();

      const sids = await pubchem.sidsByName('aspirin');

      expect(sids).toEqual([175, 344234]);
    });

    it('should build correct URL with encoded name', async () => {
      mockFetchJson({ IdentifierList: { SID: [175] } });
      const pubchem = new PubChem();

      await pubchem.sidsByName('acetylsalicylic acid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/substance/name/acetylsalicylic%20acid/sids/JSON');
    });

    it('should handle missing IdentifierList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const sids = await pubchem.sidsByName('unknown');

      expect(sids).toEqual([]);
    });

    it('should handle missing SID array', async () => {
      mockFetchJson({ IdentifierList: {} });
      const pubchem = new PubChem();

      const sids = await pubchem.sidsByName('unknown');

      expect(sids).toEqual([]);
    });

    it('should throw on 404 for unknown substance', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.sidsByName('notarealsubstance')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('assayByAid', () => {
    it('should fetch assay by AID and map fields', async () => {
      mockFetchJson({
        PC_AssayContainer: [
          {
            assay: {
              descr: {
                aid: { id: 1000 },
                name: 'qHTS for inhibitors',
                description: ['A screening assay.'],
                protocol: ['Step 1: add compound.', 'Step 2: measure.'],
                aid_source: {
                  db: { name: 'PCBA', source_id: { str: '1000' } },
                },
              },
            },
          },
        ],
      });
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1000);

      expect(assay.aid).toBe(1000);
      expect(assay.name).toBe('qHTS for inhibitors');
      expect(assay.description).toBe('A screening assay.');
      expect(assay.protocol).toBe('Step 1: add compound. Step 2: measure.');
      expect(assay.sourceName).toBe('PCBA');
      expect(assay.sourceId).toBe('1000');
    });

    it('should build correct URL with AID', async () => {
      mockFetchJson({ PC_AssayContainer: [] });
      const pubchem = new PubChem();

      await pubchem.assayByAid(1000);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/assay/aid/1000/description/JSON');
    });

    it('should handle missing PC_AssayContainer', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1);

      expect(assay.aid).toBe(0);
      expect(assay.name).toBe('');
      expect(assay.description).toBe('');
      expect(assay.protocol).toBe('');
      expect(assay.sourceName).toBe('');
      expect(assay.sourceId).toBe('');
    });

    it('should handle empty PC_AssayContainer array', async () => {
      mockFetchJson({ PC_AssayContainer: [] });
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1);

      expect(assay.aid).toBe(0);
      expect(assay.name).toBe('');
    });

    it('should handle container with missing assay wrapper', async () => {
      mockFetchJson({ PC_AssayContainer: [{}] });
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1);

      expect(assay.aid).toBe(0);
      expect(assay.name).toBe('');
    });

    it('should handle container with missing descr', async () => {
      mockFetchJson({ PC_AssayContainer: [{ assay: {} }] });
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1);

      expect(assay.aid).toBe(0);
    });

    it('should handle missing aid_source fields', async () => {
      mockFetchJson({
        PC_AssayContainer: [{ assay: { descr: { aid: { id: 1 }, name: 'test' } } }],
      });
      const pubchem = new PubChem();

      const assay = await pubchem.assayByAid(1);

      expect(assay.sourceName).toBe('');
      expect(assay.sourceId).toBe('');
    });

    it('should throw on 404 for non-existent assay', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.assayByAid(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('assayByAidBatch', () => {
    it('should fetch multiple assays and map all entries', async () => {
      mockFetchJson({
        PC_AssayContainer: [
          {
            assay: {
              descr: {
                aid: { id: 1000 },
                name: 'Assay 1',
                description: ['First assay.'],
                protocol: [],
                aid_source: { db: { name: 'PCBA', source_id: { str: '1000' } } },
              },
            },
          },
          {
            assay: {
              descr: {
                aid: { id: 2000 },
                name: 'Assay 2',
                description: ['Second assay.'],
                protocol: [],
                aid_source: { db: { name: 'PCBA', source_id: { str: '2000' } } },
              },
            },
          },
        ],
      });
      const pubchem = new PubChem();

      const assays = await pubchem.assayByAidBatch([1000, 2000]);

      expect(assays).toHaveLength(2);
      expect(assays[0]!.aid).toBe(1000);
      expect(assays[0]!.name).toBe('Assay 1');
      expect(assays[1]!.aid).toBe(2000);
      expect(assays[1]!.name).toBe('Assay 2');
    });

    it('should build correct URL with comma-separated AIDs', async () => {
      mockFetchJson({ PC_AssayContainer: [] });
      const pubchem = new PubChem();

      await pubchem.assayByAidBatch([1000, 2000]);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/assay/aid/1000%2C2000/description/JSON');
    });

    it('should return empty array for empty AIDs', async () => {
      const pubchem = new PubChem();

      const assays = await pubchem.assayByAidBatch([]);

      expect(assays).toEqual([]);
    });

    it('should handle missing PC_AssayContainer', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const assays = await pubchem.assayByAidBatch([1000]);

      expect(assays).toEqual([]);
    });
  });

  describe('assaySummary', () => {
    it('should fetch assay summary with SID and CID counts', async () => {
      mockFetchJson({
        InformationList: {
          Information: [{ AID: 1000, SID: [1, 2, 3, 4, 5], CID: [100, 200, 300] }],
        },
      });
      const pubchem = new PubChem();

      const summary = await pubchem.assaySummary(1000);

      expect(summary.aid).toBe(1000);
      expect(summary.sidCount).toBe(5);
      expect(summary.cidCount).toBe(3);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ InformationList: { Information: [{ AID: 1000 }] } });
      const pubchem = new PubChem();

      await pubchem.assaySummary(1000);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/assay/aid/1000/sids/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const summary = await pubchem.assaySummary(1);

      expect(summary.aid).toBe(0);
      expect(summary.sidCount).toBe(0);
      expect(summary.cidCount).toBe(0);
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const summary = await pubchem.assaySummary(1);

      expect(summary.aid).toBe(0);
      expect(summary.sidCount).toBe(0);
    });

    it('should handle Information entry with missing SID/CID arrays', async () => {
      mockFetchJson({ InformationList: { Information: [{ AID: 1000 }] } });
      const pubchem = new PubChem();

      const summary = await pubchem.assaySummary(1000);

      expect(summary.aid).toBe(1000);
      expect(summary.sidCount).toBe(0);
      expect(summary.cidCount).toBe(0);
    });

    it('should throw on 404 for non-existent assay', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.assaySummary(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundAnnotations', () => {
    it('should fetch compound annotations and map fields', async () => {
      mockFetchJson({
        Record: {
          RecordType: 'CID',
          RecordNumber: 2244,
          RecordTitle: 'Aspirin',
          Section: [
            {
              TOCHeading: 'Names and Identifiers',
              Description: 'Chemical names',
              Section: [],
              Information: [
                {
                  ReferenceNumber: 1,
                  Name: 'IUPAC Name',
                  Value: { StringWithMarkup: [{ String: '2-acetyloxybenzoic acid' }] },
                  URL: 'https://example.com',
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const record = await pubchem.compoundAnnotations(2244);

      expect(record.recordType).toBe('CID');
      expect(record.recordNumber).toBe(2244);
      expect(record.recordTitle).toBe('Aspirin');
      expect(record.sections).toHaveLength(1);
      expect(record.sections[0]!.tocHeading).toBe('Names and Identifiers');
      expect(record.sections[0]!.information[0]!.name).toBe('IUPAC Name');
      expect(record.sections[0]!.information[0]!.value).toBe('2-acetyloxybenzoic acid');
    });

    it('should build correct URL without heading', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.compoundAnnotations(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/2244/JSON');
    });

    it('should build correct URL with heading filter', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.compoundAnnotations(2244, 'GHS Classification');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/2244/JSON?heading=GHS%20Classification',
      );
    });

    it('should handle missing Record', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const record = await pubchem.compoundAnnotations(1);

      expect(record.recordType).toBe('');
      expect(record.recordNumber).toBe(0);
      expect(record.recordTitle).toBe('');
      expect(record.sections).toEqual([]);
    });

    it('should handle numeric annotation values', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Properties',
              Information: [
                {
                  ReferenceNumber: 1,
                  Name: 'Molecular Weight',
                  Value: { Number: [180.16] },
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const record = await pubchem.compoundAnnotations(2244);

      expect(record.sections[0]!.information[0]!.value).toBe('180.16');
    });

    it('should handle nested sections', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Parent',
              Section: [{ TOCHeading: 'Child', Information: [] }],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const record = await pubchem.compoundAnnotations(2244);

      expect(record.sections[0]!.sections[0]!.tocHeading).toBe('Child');
    });
  });

  describe('substanceAnnotations', () => {
    it('should build correct URL', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.substanceAnnotations(175);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/substance/175/JSON');
    });

    it('should build correct URL with heading', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.substanceAnnotations(175, 'Depositor Comments');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('?heading=Depositor%20Comments');
    });
  });

  describe('assayAnnotations', () => {
    it('should build correct URL', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.assayAnnotations(1000);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/bioassay/1000/JSON');
    });

    it('should build correct URL with heading', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.assayAnnotations(1000, 'Protocol');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('?heading=Protocol');
    });
  });

  describe('geneByGeneId', () => {
    it('should fetch gene by gene ID and map all fields', async () => {
      mockFetchJson({
        GeneSummaries: {
          GeneSummary: [
            {
              GeneID: 7157,
              Symbol: 'TP53',
              Name: 'tumor protein p53',
              TaxID: 9606,
              Description: 'This gene encodes a tumor suppressor protein.',
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const gene = await pubchem.geneByGeneId(7157);

      expect(gene.geneId).toBe(7157);
      expect(gene.symbol).toBe('TP53');
      expect(gene.name).toBe('tumor protein p53');
      expect(gene.taxId).toBe(9606);
      expect(gene.description).toBe('This gene encodes a tumor suppressor protein.');
    });

    it('should build correct URL with gene ID', async () => {
      mockFetchJson({ GeneSummaries: { GeneSummary: [] } });
      const pubchem = new PubChem();

      await pubchem.geneByGeneId(7157);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/gene/geneid/7157/summary/JSON');
    });

    it('should handle missing GeneSummaries', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const gene = await pubchem.geneByGeneId(1);

      expect(gene.geneId).toBe(0);
      expect(gene.symbol).toBe('');
      expect(gene.name).toBe('');
      expect(gene.taxId).toBe(0);
      expect(gene.description).toBe('');
    });

    it('should handle empty GeneSummary array', async () => {
      mockFetchJson({ GeneSummaries: { GeneSummary: [] } });
      const pubchem = new PubChem();

      const gene = await pubchem.geneByGeneId(1);

      expect(gene.geneId).toBe(0);
      expect(gene.symbol).toBe('');
    });

    it('should handle GeneSummary entry with missing fields', async () => {
      mockFetchJson({ GeneSummaries: { GeneSummary: [{ GeneID: 7157 }] } });
      const pubchem = new PubChem();

      const gene = await pubchem.geneByGeneId(7157);

      expect(gene.geneId).toBe(7157);
      expect(gene.symbol).toBe('');
      expect(gene.name).toBe('');
      expect(gene.taxId).toBe(0);
      expect(gene.description).toBe('');
    });

    it('should throw on 404 for non-existent gene', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.geneByGeneId(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('geneByCid', () => {
    it('should return gene IDs linked to a compound', async () => {
      mockFetchJson({
        InformationList: {
          Information: [{ CID: 2244, GeneID: [7157, 672] }],
        },
      });
      const pubchem = new PubChem();

      const geneIds = await pubchem.geneByCid(2244);

      expect(geneIds).toEqual([7157, 672]);
    });

    it('should build correct URL with CID', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      await pubchem.geneByCid(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/compound/cid/2244/xrefs/GeneID/JSON');
    });

    it('should handle missing InformationList', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const geneIds = await pubchem.geneByCid(1);

      expect(geneIds).toEqual([]);
    });

    it('should handle empty Information array', async () => {
      mockFetchJson({ InformationList: { Information: [] } });
      const pubchem = new PubChem();

      const geneIds = await pubchem.geneByCid(1);

      expect(geneIds).toEqual([]);
    });

    it('should handle Information entry with missing GeneID', async () => {
      mockFetchJson({ InformationList: { Information: [{ CID: 2244 }] } });
      const pubchem = new PubChem();

      const geneIds = await pubchem.geneByCid(2244);

      expect(geneIds).toEqual([]);
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.geneByCid(999999999)).rejects.toThrow('PubChem API returned status 404');
    });
  });

  describe('proteinByAccession', () => {
    it('should fetch protein by accession and map all fields', async () => {
      mockFetchJson({
        ProteinSummaries: {
          ProteinSummary: [
            {
              RegistryID: 'P04637',
              Name: 'Cellular tumor antigen p53',
              Organism: 'Homo sapiens',
              TaxID: 9606,
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const protein = await pubchem.proteinByAccession('P04637');

      expect(protein.accession).toBe('P04637');
      expect(protein.name).toBe('Cellular tumor antigen p53');
      expect(protein.organism).toBe('Homo sapiens');
      expect(protein.taxId).toBe(9606);
    });

    it('should build correct URL with encoded accession', async () => {
      mockFetchJson({ ProteinSummaries: { ProteinSummary: [] } });
      const pubchem = new PubChem();

      await pubchem.proteinByAccession('P04637');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/protein/accession/P04637/summary/JSON');
    });

    it('should handle missing ProteinSummaries', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const protein = await pubchem.proteinByAccession('UNKNOWN');

      expect(protein.accession).toBe('');
      expect(protein.name).toBe('');
      expect(protein.organism).toBe('');
      expect(protein.taxId).toBe(0);
    });

    it('should handle empty ProteinSummary array', async () => {
      mockFetchJson({ ProteinSummaries: { ProteinSummary: [] } });
      const pubchem = new PubChem();

      const protein = await pubchem.proteinByAccession('UNKNOWN');

      expect(protein.accession).toBe('');
      expect(protein.name).toBe('');
    });

    it('should handle ProteinSummary entry with missing fields', async () => {
      mockFetchJson({ ProteinSummaries: { ProteinSummary: [{ RegistryID: 'P04637' }] } });
      const pubchem = new PubChem();

      const protein = await pubchem.proteinByAccession('P04637');

      expect(protein.accession).toBe('P04637');
      expect(protein.name).toBe('');
      expect(protein.organism).toBe('');
      expect(protein.taxId).toBe(0);
    });

    it('should throw on 404 for non-existent protein', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.proteinByAccession('INVALID')).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundClassification', () => {
    it('should fetch classification hierarchy and map nodes', async () => {
      mockFetchJson({
        Record: {
          RecordType: 'CID',
          RecordNumber: 2244,
          Section: [
            {
              TOCHeading: 'Classification',
              Section: [
                {
                  TOCHeading: 'MeSH Tree',
                  Description: 'MeSH classification',
                  Section: [
                    {
                      TOCHeading: 'Analgesics',
                      Description: 'Pain relievers',
                      Section: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(2244);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]!.name).toBe('MeSH Tree');
      expect(nodes[0]!.description).toBe('MeSH classification');
      expect(nodes[0]!.childNodes).toHaveLength(1);
      expect(nodes[0]!.childNodes[0]!.name).toBe('Analgesics');
      expect(nodes[0]!.childNodes[0]!.description).toBe('Pain relievers');
      expect(nodes[0]!.childNodes[0]!.childNodes).toEqual([]);
    });

    it('should build correct URL with heading filter', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.compoundClassification(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/2244/JSON?heading=Classification',
      );
    });

    it('should handle missing Record', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes).toEqual([]);
    });

    it('should handle missing Classification section', async () => {
      mockFetchJson({
        Record: {
          Section: [{ TOCHeading: 'Other', Section: [] }],
        },
      });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes).toEqual([]);
    });

    it('should handle empty Section array', async () => {
      mockFetchJson({ Record: { Section: [] } });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes).toEqual([]);
    });

    it('should find Classification section nested inside a parent section', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Wrapper',
              Section: [
                {
                  TOCHeading: 'Classification',
                  Section: [{ TOCHeading: 'Nested Class', Description: 'Found via recursion' }],
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes).toHaveLength(1);
      expect(nodes[0]!.name).toBe('Nested Class');
      expect(nodes[0]!.description).toBe('Found via recursion');
    });

    it('should handle Classification section with no child sections', async () => {
      mockFetchJson({
        Record: {
          Section: [{ TOCHeading: 'Classification' }],
        },
      });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes).toEqual([]);
    });

    it('should handle deeply nested classification', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Classification',
              Section: [
                {
                  TOCHeading: 'Level 1',
                  Section: [
                    {
                      TOCHeading: 'Level 2',
                      Section: [{ TOCHeading: 'Level 3' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const nodes = await pubchem.compoundClassification(1);

      expect(nodes[0]!.childNodes[0]!.childNodes[0]!.name).toBe('Level 3');
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundClassification(999999999)).rejects.toThrow(
        'PubChem API returned status 404',
      );
    });
  });

  describe('compoundPatents', () => {
    it('should fetch patents and map all fields', async () => {
      mockFetchJson({
        Record: {
          RecordType: 'CID',
          RecordNumber: 2244,
          Section: [
            {
              TOCHeading: 'Patents',
              Information: [
                {
                  ReferenceNumber: 1,
                  Value: {
                    StringWithMarkup: [{ String: 'US-1234567-A' }],
                    ExtraColumns: {
                      Title: 'Aspirin formulation',
                      'Inventor Names': ['John Doe', 'Jane Smith'],
                      'Assignee Names': ['Pharma Corp'],
                    },
                  },
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(2244);

      expect(patents).toHaveLength(1);
      expect(patents[0]!.patentId).toBe('US-1234567-A');
      expect(patents[0]!.title).toBe('Aspirin formulation');
      expect(patents[0]!.inventorNames).toEqual(['John Doe', 'Jane Smith']);
      expect(patents[0]!.assigneeNames).toEqual(['Pharma Corp']);
    });

    it('should build correct URL with heading filter', async () => {
      mockFetchJson({ Record: {} });
      const pubchem = new PubChem();

      await pubchem.compoundPatents(2244);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/2244/JSON?heading=Patents',
      );
    });

    it('should handle missing Record', async () => {
      mockFetchJson({});
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toEqual([]);
    });

    it('should handle missing Patents section', async () => {
      mockFetchJson({
        Record: {
          Section: [{ TOCHeading: 'Other' }],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toEqual([]);
    });

    it('should handle Patents section with empty Information', async () => {
      mockFetchJson({
        Record: {
          Section: [{ TOCHeading: 'Patents', Information: [] }],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toEqual([]);
    });

    it('should handle patent entry with missing ExtraColumns', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Patents',
              Information: [
                {
                  ReferenceNumber: 1,
                  Value: { StringWithMarkup: [{ String: 'US-9999999-A' }] },
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toHaveLength(1);
      expect(patents[0]!.patentId).toBe('US-9999999-A');
      expect(patents[0]!.title).toBe('');
      expect(patents[0]!.inventorNames).toEqual([]);
      expect(patents[0]!.assigneeNames).toEqual([]);
    });

    it('should handle patent entry with missing Value', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Patents',
              Information: [{ ReferenceNumber: 1 }],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toHaveLength(1);
      expect(patents[0]!.patentId).toBe('');
      expect(patents[0]!.title).toBe('');
      expect(patents[0]!.inventorNames).toEqual([]);
      expect(patents[0]!.assigneeNames).toEqual([]);
    });

    it('should handle multiple patents', async () => {
      mockFetchJson({
        Record: {
          Section: [
            {
              TOCHeading: 'Patents',
              Information: [
                {
                  Value: {
                    StringWithMarkup: [{ String: 'US-111-A' }],
                    ExtraColumns: {
                      Title: 'Patent 1',
                      'Inventor Names': ['Inv 1'],
                      'Assignee Names': ['Assign 1'],
                    },
                  },
                },
                {
                  Value: {
                    StringWithMarkup: [{ String: 'US-222-B' }],
                    ExtraColumns: {
                      Title: 'Patent 2',
                      'Inventor Names': ['Inv 2'],
                      'Assignee Names': ['Assign 2'],
                    },
                  },
                },
              ],
            },
          ],
        },
      });
      const pubchem = new PubChem();

      const patents = await pubchem.compoundPatents(1);

      expect(patents).toHaveLength(2);
      expect(patents[0]!.patentId).toBe('US-111-A');
      expect(patents[1]!.patentId).toBe('US-222-B');
    });

    it('should throw on 404 for non-existent compound', async () => {
      mockFetchError(404, 'PUGREST.NotFound');
      const pubchem = new PubChem();

      await expect(pubchem.compoundPatents(999999999)).rejects.toThrow(
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
