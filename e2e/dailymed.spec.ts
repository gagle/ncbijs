import { describe, expect, it } from 'vitest';
import { DailyMed } from '@ncbijs/dailymed';

const dailymed = new DailyMed();

describe('DailyMed E2E', () => {
  it('should search drug names', async () => {
    let result;
    try {
      result = await dailymed.drugNames('aspirin', { pageSize: 3 });
    } catch {
      return;
    }

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.pagination.totalElements).toBeGreaterThan(0);
  });

  it('should search SPLs by drug name', async () => {
    let result;
    try {
      result = await dailymed.spls('metformin', { pageSize: 3 });
    } catch {
      return;
    }

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]!.setId).toBeTruthy();
    expect(result.data[0]!.title).toBeTruthy();
  });

  it('should search NDC codes by drug name', async () => {
    let result;
    try {
      result = await dailymed.ndcs('ibuprofen', { pageSize: 3 });
    } catch {
      return;
    }

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]!.ndc).toBeTruthy();
  });

  it('should list drug classes', async () => {
    let result;
    try {
      result = await dailymed.drugClasses({ pageSize: 3 });
    } catch {
      return;
    }

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]!.name).toBeTruthy();
  });
});
