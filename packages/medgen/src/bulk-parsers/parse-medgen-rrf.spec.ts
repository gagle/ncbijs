import { describe, expect, it } from 'vitest';
import { parseMedGenRrf } from './parse-medgen-rrf';

const MGCONSO_LINES = [
  'C0001175|MSH|PT|Acquired Immunodeficiency Syndrome|Y|',
  'C0001175|NCI|SY|AIDS|N|',
  'C0020538|MSH|PT|Hypertension|Y|',
].join('\n');

const MGDEF_LINES = [
  'C0001175|An acquired deficiency of cellular immunity.|MSH|',
  'C0020538|Persistently high systemic arterial BLOOD PRESSURE.|MSH|',
  'C0020538|A disorder characterized by high blood pressure.|NCI|',
].join('\n');

const MGSTY_LINES = ['C0001175|Disease or Syndrome|', 'C0020538|Disease or Syndrome|'].join('\n');

describe('parseMedGenRrf', () => {
  it('parses MGCONSO into concepts', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });

    expect(result).toHaveLength(2);
  });

  it('extracts CUI as uid and conceptId', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });

    expect(result[0]!.uid).toBe('C0001175');
    expect(result[0]!.conceptId).toBe('C0001175');
  });

  it('uses preferred name as title', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });

    expect(result[0]!.title).toBe('Acquired Immunodeficiency Syndrome');
  });

  it('collects all names from MGCONSO', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });

    expect(result[0]!.names).toHaveLength(2);
    expect(result[0]!.names[0]).toEqual({
      name: 'Acquired Immunodeficiency Syndrome',
      source: 'MSH',
      type: 'PT',
    });
    expect(result[0]!.names[1]).toEqual({
      name: 'AIDS',
      source: 'NCI',
      type: 'SY',
    });
  });

  it('adds definitions from MGDEF', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES, mgdef: MGDEF_LINES });

    expect(result[0]!.definitions).toHaveLength(1);
    expect(result[0]!.definitions[0]!.text).toBe('An acquired deficiency of cellular immunity.');
    expect(result[0]!.definitions[0]!.source).toBe('MSH');
  });

  it('supports multiple definitions per concept', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES, mgdef: MGDEF_LINES });

    expect(result[1]!.definitions).toHaveLength(2);
  });

  it('uses first definition as primary definition', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES, mgdef: MGDEF_LINES });

    expect(result[0]!.definition).toBe('An acquired deficiency of cellular immunity.');
  });

  it('adds semantic type from MGSTY', () => {
    const result = parseMedGenRrf({
      mgconso: MGCONSO_LINES,
      mgsty: MGSTY_LINES,
    });

    expect(result[0]!.semanticType).toBe('Disease or Syndrome');
    expect(result[1]!.semanticType).toBe('Disease or Syndrome');
  });

  it('defaults to empty when MGDEF and MGSTY are omitted', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });

    expect(result[0]!.definition).toBe('');
    expect(result[0]!.semanticType).toBe('');
    expect(result[0]!.definitions).toEqual([]);
  });

  it('defaults associated fields to empty arrays', () => {
    const result = parseMedGenRrf({ mgconso: MGCONSO_LINES });
    const concept = result[0]!;

    expect(concept.associatedGenes).toEqual([]);
    expect(concept.modesOfInheritance).toEqual([]);
    expect(concept.clinicalFeatures).toEqual([]);
    expect(concept.omimIds).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(parseMedGenRrf({ mgconso: '' })).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const mgconso = ['# header', '', MGCONSO_LINES.split('\n')[0]!].join('\n');
    const result = parseMedGenRrf({ mgconso });

    expect(result).toHaveLength(1);
  });

  it('skips lines with too few fields', () => {
    const badLine = 'C0001175|MSH';
    const result = parseMedGenRrf({ mgconso: badLine });

    expect(result).toEqual([]);
  });

  it('skips lines with empty CUI or name', () => {
    const emptyCui = '|MSH|PT|Name|Y|';
    const emptyName = 'C0001175|MSH|PT||Y|';
    const result = parseMedGenRrf({ mgconso: [emptyCui, emptyName].join('\n') });

    expect(result).toEqual([]);
  });
});
