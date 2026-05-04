import { describe, expect, it } from 'vitest';
import { parsePmcS3Inventory } from './parse-pmc-s3-inventory';

const SAMPLE_CSV = [
  'pmc-oa-opendata,oa_comm/xml/all/PMC10000001/v1/PMC10000001.xml,52431,2023-01-15T10:30:00.000Z,"abc123",STANDARD',
  'pmc-oa-opendata,oa_comm/pdf/all/PMC10000002/v2/PMC10000002.pdf,184320,2023-02-20T14:15:00.000Z,"def456",STANDARD',
].join('\n');

describe('parsePmcS3Inventory', () => {
  it('parses multiple rows', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result).toHaveLength(2);
  });

  it('extracts bucket', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.bucket).toBe('pmc-oa-opendata');
  });

  it('extracts key', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.key).toBe('oa_comm/xml/all/PMC10000001/v1/PMC10000001.xml');
  });

  it('extracts sizeBytes', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.sizeBytes).toBe(52431);
    expect(result[1]!.sizeBytes).toBe(184320);
  });

  it('extracts lastModified', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.lastModified).toBe('2023-01-15T10:30:00.000Z');
  });

  it('extracts eTag stripping surrounding quotes', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.eTag).toBe('abc123');
    expect(result[1]!.eTag).toBe('def456');
  });

  it('extracts storageClass', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.storageClass).toBe('STANDARD');
  });

  it('extracts pmcid from key path', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.pmcid).toBe('PMC10000001');
    expect(result[1]!.pmcid).toBe('PMC10000002');
  });

  it('extracts version from key path', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.version).toBe('v1');
    expect(result[1]!.version).toBe('v2');
  });

  it('extracts format from file extension', () => {
    const result = parsePmcS3Inventory(SAMPLE_CSV);

    expect(result[0]!.format).toBe('xml');
    expect(result[1]!.format).toBe('pdf');
  });

  it('returns empty array for empty input', () => {
    expect(parsePmcS3Inventory('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parsePmcS3Inventory('  \n  ')).toEqual([]);
  });

  it('skips comment lines', () => {
    const csv = ['# header line', SAMPLE_CSV].join('\n');
    const result = parsePmcS3Inventory(csv);

    expect(result).toHaveLength(2);
  });

  it('skips rows with fewer than 6 fields', () => {
    const csv = ['bucket,key,size,date,etag', SAMPLE_CSV].join('\n');
    const result = parsePmcS3Inventory(csv);

    expect(result).toHaveLength(2);
  });

  it('handles key without PMC prefix as empty pmcid', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/xml/readme.txt,1024,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.pmcid).toBe('');
  });

  it('handles key without version segment as empty version', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/PMC10000001/PMC10000001.xml,1024,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.version).toBe('');
    expect(result[0]!.pmcid).toBe('PMC10000001');
  });

  it('handles key without extension as empty format', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/xml/all/PMC10000001/v1/LICENSE,512,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.format).toBe('');
  });

  it('handles non-numeric size as zero', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/xml/all/PMC10000001/v1/PMC10000001.xml,abc,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.sizeBytes).toBe(0);
  });

  it('handles trailing newline', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/xml/all/PMC10000001/v1/PMC10000001.xml,1024,2023-01-01T00:00:00.000Z,"aaa",STANDARD\n';
    const result = parsePmcS3Inventory(csv);

    expect(result).toHaveLength(1);
  });

  it('handles CSV fields with commas inside quotes', () => {
    const csv =
      'pmc-oa-opendata,"oa_comm/xml/all/PMC10000001/v1/file,name.xml",1024,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.key).toBe('oa_comm/xml/all/PMC10000001/v1/file,name.xml');
  });

  it('handles eTag without surrounding quotes', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/xml/all/PMC10000001/v1/PMC10000001.xml,1024,2023-01-01T00:00:00.000Z,abc123,STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.eTag).toBe('abc123');
  });

  it('handles tar.gz format', () => {
    const csv =
      'pmc-oa-opendata,oa_comm/tar/all/PMC10000001/v1/PMC10000001.tar.gz,2048,2023-01-01T00:00:00.000Z,"aaa",STANDARD';
    const result = parsePmcS3Inventory(csv);

    expect(result[0]!.format).toBe('gz');
  });
});
