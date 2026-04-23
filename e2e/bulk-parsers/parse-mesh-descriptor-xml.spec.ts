import { describe, expect, it } from 'vitest';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { readFixture } from './fixture-reader';

describe('parseMeshDescriptorXml (real data)', () => {
  const treeData = parseMeshDescriptorXml(readFixture('mesh-descriptors-sample.xml'));

  it('should parse descriptors from MeSH XML', () => {
    expect(treeData.descriptors.length).toBe(3);
  });

  it('should have descriptor IDs and names', () => {
    const first = treeData.descriptors[0]!;

    expect(first.id).toBe('D000001');
    expect(first.name).toBe('Calcimycin');
  });

  it('should have tree numbers', () => {
    const abdomen = treeData.descriptors[1]!;

    expect(abdomen.treeNumbers.length).toBe(2);
    expect(abdomen.treeNumbers[0]).toBe('A01.047');
  });

  it('should have qualifiers', () => {
    const calcimycin = treeData.descriptors[0]!;

    expect(calcimycin.qualifiers.length).toBe(2);
    expect(calcimycin.qualifiers[0]!.name).toBe('administration & dosage');
    expect(calcimycin.qualifiers[0]!.abbreviation).toBe('AD');
  });

  it('should have pharmacological actions', () => {
    const acetaminophen = treeData.descriptors[2]!;

    expect(acetaminophen.pharmacologicalActions.length).toBe(2);
    expect(acetaminophen.pharmacologicalActions[0]).toBe('Analgesics, Non-Narcotic');
  });
});
