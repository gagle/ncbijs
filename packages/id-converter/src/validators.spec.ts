import { describe, expect, it } from 'vitest';
import { isDOI, isMID, isPMCID, isPMID } from './validate';

describe('isPMID', () => {
  it('should return true for valid numeric PMID', () => {
    expect(isPMID('12345678')).toBe(true);
  });

  it('should return true for short PMID', () => {
    expect(isPMID('1')).toBe(true);
  });

  it('should return true for long PMID', () => {
    expect(isPMID('999999999')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isPMID('')).toBe(false);
  });

  it('should return false for non-numeric string', () => {
    expect(isPMID('abc')).toBe(false);
  });

  it('should return false for negative number', () => {
    expect(isPMID('-1')).toBe(false);
  });

  it('should return false for zero', () => {
    expect(isPMID('0')).toBe(false);
  });

  it('should return false for PMID with spaces', () => {
    expect(isPMID('123 456')).toBe(false);
  });

  it('should return false for PMID with decimal', () => {
    expect(isPMID('123.45')).toBe(false);
  });
});

describe('isPMCID', () => {
  it('should return true for PMC followed by digits', () => {
    expect(isPMCID('PMC12345')).toBe(true);
  });

  it('should return true for lowercase pmc prefix', () => {
    expect(isPMCID('pmc12345')).toBe(true);
  });

  it('should return true for versioned PMCID like PMC12345.2', () => {
    expect(isPMCID('PMC12345.2')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isPMCID('')).toBe(false);
  });

  it('should return false for digits only without PMC prefix', () => {
    expect(isPMCID('12345')).toBe(false);
  });

  it('should return false for PMC without digits', () => {
    expect(isPMCID('PMC')).toBe(false);
  });

  it('should return false for PMC with non-numeric suffix', () => {
    expect(isPMCID('PMCabcd')).toBe(false);
  });
});

describe('isDOI', () => {
  it('should return true for standard DOI format 10.xxxx/yyyy', () => {
    expect(isDOI('10.1234/example')).toBe(true);
  });

  it('should return true for DOI with complex suffix', () => {
    expect(isDOI('10.1038/s41586-024-00001-x')).toBe(true);
  });

  it('should return true for DOI with special characters', () => {
    expect(isDOI('10.1234/example.with-special_chars')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isDOI('')).toBe(false);
  });

  it('should return false for string not starting with 10.', () => {
    expect(isDOI('11.1234/example')).toBe(false);
  });

  it('should return false for DOI without slash separator', () => {
    expect(isDOI('10.1234example')).toBe(false);
  });

  it('should return false for incomplete DOI', () => {
    expect(isDOI('10.')).toBe(false);
  });
});

describe('isMID', () => {
  it('should return true for valid MID format', () => {
    expect(isMID('NIHMS1677310')).toBe(true);
  });

  it('should return true for NIHMS followed by digits', () => {
    expect(isMID('nihms123')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isMID('')).toBe(false);
  });

  it('should return false for random string', () => {
    expect(isMID('foobar')).toBe(false);
  });

  it('should return false for numeric-only string', () => {
    expect(isMID('1677310')).toBe(false);
  });
});
