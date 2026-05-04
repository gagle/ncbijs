import { describe, expect, it } from 'vitest';
import { parsePmcS3Inventory } from '@ncbijs/pmc';
import { readFixture } from './fixture-reader';

describe('parsePmcS3Inventory (real data)', () => {
  const records = parsePmcS3Inventory(readFixture('pmc-s3-sample.csv'));

  it('should parse records from PMC S3 inventory data', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it('should have bucket name', () => {
    for (const record of records) {
      expect(record.bucket).toBe('pmc-oa-opendata');
    }
  });

  it('should have S3 keys', () => {
    for (const record of records) {
      expect(record.key.length).toBeGreaterThan(0);
    }
  });

  it('should extract PMCID from S3 key', () => {
    const withPmcid = records.find((record) => record.pmcid.length > 0);

    expect(withPmcid).toBeDefined();
    expect(withPmcid!.pmcid).toMatch(/^PMC\d+$/);
  });

  it('should extract version from S3 key', () => {
    const withVersion = records.find((record) => record.version.length > 0);

    expect(withVersion).toBeDefined();
    expect(withVersion!.version).toMatch(/^v\d+$/);
  });

  it('should extract file format from S3 key', () => {
    const withFormat = records.find((record) => record.format.length > 0);

    expect(withFormat).toBeDefined();
  });

  it('should have positive file sizes', () => {
    for (const record of records) {
      expect(record.sizeBytes).toBeGreaterThan(0);
    }
  });
});
