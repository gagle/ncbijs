import { describe, expect, it } from 'vitest';

import { parsePubTatorTsv } from './parse-pubtator-tsv.js';

describe('parsePubTatorTsv', () => {
  describe('basic parsing', () => {
    it('should parse single annotation line', () => {
      const input = '12345\t10\t15\tBRCA1\tGene\t672';
      const result = parsePubTatorTsv(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pmid: '12345',
        start: 10,
        end: 15,
        text: 'BRCA1',
        type: 'Gene',
        id: '672',
      });
    });

    it('should parse multiple annotation lines', () => {
      const input = [
        '12345\t10\t15\tBRCA1\tGene\t672',
        '12345\t20\t35\tbreast cancer\tDisease\tMESH:D001943',
      ].join('\n');
      const result = parsePubTatorTsv(input);
      expect(result).toHaveLength(2);
    });

    it('should extract pmid, start, end, text, type, id', () => {
      const input = '99999\t100\t200\taspirin\tChemical\tMESH:D001241';
      const result = parsePubTatorTsv(input);
      expect(result[0]).toEqual({
        pmid: '99999',
        start: 100,
        end: 200,
        text: 'aspirin',
        type: 'Chemical',
        id: 'MESH:D001241',
      });
    });

    it('should return empty array for empty input', () => {
      expect(parsePubTatorTsv('')).toEqual([]);
      expect(parsePubTatorTsv('   ')).toEqual([]);
      expect(parsePubTatorTsv('\n')).toEqual([]);
    });
  });

  describe('entity types', () => {
    it('should parse Gene annotations', () => {
      const input = '12345\t0\t5\tBRCA1\tGene\t672';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('Gene');
    });

    it('should parse Disease annotations', () => {
      const input = '12345\t0\t10\tlung cancer\tDisease\tMESH:D008175';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('Disease');
    });

    it('should parse Chemical annotations', () => {
      const input = '12345\t0\t7\taspirin\tChemical\tMESH:D001241';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('Chemical');
    });

    it('should parse Variant annotations', () => {
      const input = '12345\t0\t8\tp.V600E\tVariant\ttmVar:p.V600E';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('Variant');
    });

    it('should parse Species annotations', () => {
      const input = '12345\t0\t5\thuman\tSpecies\t9606';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('Species');
    });

    it('should parse CellLine annotations', () => {
      const input = '12345\t0\t5\tHeLa\tCellLine\tCVCL:0030';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.type).toBe('CellLine');
    });
  });

  describe('edge cases', () => {
    it('should handle tab-separated values correctly', () => {
      const input = '12345\t0\t10\tsome text\tGene\tID123';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.text).toBe('some text');
    });

    it('should handle annotations with special characters in text', () => {
      const input = '12345\t0\t20\tp.Arg248Trp (R248W)\tVariant\ttmVar:p.R248W';
      const result = parsePubTatorTsv(input);
      expect(result[0]?.text).toBe('p.Arg248Trp (R248W)');
    });

    it('should skip title and abstract lines', () => {
      const input = [
        '12345|t|This is the title',
        '12345|a|This is the abstract',
        '12345\t10\t15\tBRCA1\tGene\t672',
      ].join('\n');
      const result = parsePubTatorTsv(input);
      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('BRCA1');
    });

    it('should handle multiple PMIDs in single input', () => {
      const input = [
        '11111\t0\t5\tBRCA1\tGene\t672',
        '22222\t0\t7\taspirin\tChemical\tMESH:D001241',
      ].join('\n');
      const result = parsePubTatorTsv(input);
      expect(result).toHaveLength(2);
      expect(result[0]?.pmid).toBe('11111');
      expect(result[1]?.pmid).toBe('22222');
    });

    it('should handle malformed lines gracefully', () => {
      const input = [
        'not a valid line',
        '12345\t10\t15\tBRCA1\tGene\t672',
        '',
        'another bad line',
      ].join('\n');
      const result = parsePubTatorTsv(input);
      expect(result).toHaveLength(1);
      expect(result[0]?.text).toBe('BRCA1');
    });
  });
});
