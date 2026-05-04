import { describe, expect, it } from 'vitest';
import { parseLitVarJson } from './parse-litvar-json';

const VARIANT_BRCA2 = {
  rsid: 'rs80359550',
  hgvs: ['NM_000059.4:c.5946delT', 'p.Ser1982ArgfsTer22'],
  gene: 'BRCA2',
  publication_count: 42,
};

const VARIANT_TP53 = {
  rsid: 'rs28934578',
  hgvs: ['NM_000546.6:c.743G>A'],
  gene: 'TP53',
  publication_count: 105,
};

const VARIANT_MINIMAL = {
  rsid: 'rs12345',
};

describe('parseLitVarJson', () => {
  describe('JSON array input', () => {
    it('parses an array of variants', () => {
      const json = JSON.stringify([VARIANT_BRCA2, VARIANT_TP53]);
      const result = parseLitVarJson(json);

      expect(result).toHaveLength(2);
    });

    it('extracts rsid', () => {
      const json = JSON.stringify([VARIANT_BRCA2]);
      const result = parseLitVarJson(json);

      expect(result[0]!.rsid).toBe('rs80359550');
    });

    it('extracts first HGVS notation from FTP array', () => {
      const json = JSON.stringify([VARIANT_BRCA2]);
      const result = parseLitVarJson(json);

      expect(result[0]!.hgvs).toBe('NM_000059.4:c.5946delT');
    });

    it('wraps gene string in array', () => {
      const json = JSON.stringify([VARIANT_BRCA2]);
      const result = parseLitVarJson(json);

      expect(result[0]!.gene).toEqual(['BRCA2']);
    });

    it('sets name to empty string (not in FTP format)', () => {
      const json = JSON.stringify([VARIANT_BRCA2]);
      const result = parseLitVarJson(json);

      expect(result[0]!.name).toBe('');
    });

    it('sets clinicalSignificance to empty array (not in FTP format)', () => {
      const json = JSON.stringify([VARIANT_BRCA2]);
      const result = parseLitVarJson(json);

      expect(result[0]!.clinicalSignificance).toEqual([]);
    });

    it('defaults missing fields', () => {
      const json = JSON.stringify([VARIANT_MINIMAL]);
      const result = parseLitVarJson(json);

      expect(result[0]!.rsid).toBe('rs12345');
      expect(result[0]!.hgvs).toBe('');
      expect(result[0]!.gene).toEqual([]);
      expect(result[0]!.name).toBe('');
      expect(result[0]!.clinicalSignificance).toEqual([]);
    });
  });

  describe('NDJSON input', () => {
    it('parses newline-delimited JSON', () => {
      const ndjson = [JSON.stringify(VARIANT_BRCA2), JSON.stringify(VARIANT_TP53)].join('\n');
      const result = parseLitVarJson(ndjson);

      expect(result).toHaveLength(2);
      expect(result[0]!.rsid).toBe('rs80359550');
      expect(result[1]!.rsid).toBe('rs28934578');
    });

    it('skips blank lines', () => {
      const ndjson = [JSON.stringify(VARIANT_BRCA2), '', JSON.stringify(VARIANT_TP53)].join('\n');
      const result = parseLitVarJson(ndjson);

      expect(result).toHaveLength(2);
    });

    it('skips malformed lines', () => {
      const ndjson = [
        JSON.stringify(VARIANT_BRCA2),
        '{bad json}',
        JSON.stringify(VARIANT_TP53),
      ].join('\n');
      const result = parseLitVarJson(ndjson);

      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseLitVarJson('')).toEqual([]);
    });

    it('returns empty array for whitespace input', () => {
      expect(parseLitVarJson('   ')).toEqual([]);
    });

    it('returns empty array for invalid JSON array', () => {
      expect(parseLitVarJson('[invalid')).toEqual([]);
    });

    it('parses a single JSON object as NDJSON', () => {
      const json = JSON.stringify(VARIANT_BRCA2);
      const result = parseLitVarJson(json);

      expect(result).toHaveLength(1);
      expect(result[0]!.rsid).toBe('rs80359550');
    });
  });
});
