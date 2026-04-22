import { describe, expect, it } from 'vitest';
import { parseCompoundExtras } from './parse-compound-extras';

const SMILES_TSV = [
  '1\tCC(=O)OC1=CC=CC=C1C(=O)O',
  '2\tCC(=O)Oc1ccccc1C(O)=O',
  '3\tC1=CC=CC=C1',
].join('\n');

const INCHI_TSV = ['1\tINPMHQSEZWDKQF-UHFFFAOYSA-N', '2\tBSYAMHRPZLJESI-UHFFFAOYSA-N'].join('\n');

const IUPAC_TSV = ['1\t2-acetyloxybenzoic acid', '3\tbenzene'].join('\n');

describe('parseCompoundExtras', () => {
  it('merges all three files by CID', () => {
    const result = parseCompoundExtras({
      cidSmiles: SMILES_TSV,
      cidInchiKey: INCHI_TSV,
      cidIupac: IUPAC_TSV,
    });

    expect(result).toHaveLength(3);
  });

  it('maps SMILES from CID-SMILES file', () => {
    const result = parseCompoundExtras({ cidSmiles: SMILES_TSV });
    const cid1 = result.find((record) => record.cid === 1);

    expect(cid1?.canonicalSmiles).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
  });

  it('maps InChI key from CID-InChI-Key file', () => {
    const result = parseCompoundExtras({ cidInchiKey: INCHI_TSV });
    const cid1 = result.find((record) => record.cid === 1);

    expect(cid1?.inchiKey).toBe('INPMHQSEZWDKQF-UHFFFAOYSA-N');
  });

  it('maps IUPAC name from CID-IUPAC file', () => {
    const result = parseCompoundExtras({ cidIupac: IUPAC_TSV });
    const cid1 = result.find((record) => record.cid === 1);

    expect(cid1?.iupacName).toBe('2-acetyloxybenzoic acid');
  });

  it('defaults missing fields to empty string', () => {
    const result = parseCompoundExtras({
      cidSmiles: SMILES_TSV,
      cidInchiKey: INCHI_TSV,
      cidIupac: IUPAC_TSV,
    });
    const cid2 = result.find((record) => record.cid === 2);

    expect(cid2?.iupacName).toBe('');
  });

  it('returns empty array when all files are undefined', () => {
    const result = parseCompoundExtras({});

    expect(result).toEqual([]);
  });

  it('handles single file input', () => {
    const result = parseCompoundExtras({ cidSmiles: '42\tC=O' });

    expect(result).toEqual([{ cid: 42, canonicalSmiles: 'C=O', inchiKey: '', iupacName: '' }]);
  });

  it('skips blank lines', () => {
    const smilesWithBlanks = '1\tCC\n\n2\tCCC\n  \n';
    const result = parseCompoundExtras({ cidSmiles: smilesWithBlanks });

    expect(result).toHaveLength(2);
  });

  it('skips lines without tab separator', () => {
    const badSmiles = '1\tCC\nno-tab-here\n2\tCCC';
    const result = parseCompoundExtras({ cidSmiles: badSmiles });

    expect(result).toHaveLength(2);
  });

  it('skips lines with non-numeric CID', () => {
    const badCid = 'abc\tCC\n1\tCCC';
    const result = parseCompoundExtras({ cidSmiles: badCid });

    expect(result).toHaveLength(1);
    expect(result[0].cid).toBe(1);
  });
});
