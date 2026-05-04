import { describe, expect, it } from 'vitest';
import { ClinicalTrials } from '@ncbijs/clinical-trials';

const ct = new ClinicalTrials();

describe('ClinicalTrials E2E', () => {
  it('should fetch a study by NCT ID', async () => {
    const study = await ct.study('NCT04280705');

    expect(study.nctId).toBe('NCT04280705');
    expect(study.briefTitle).toBeTruthy();
    expect(study.overallStatus).toBeTruthy();
  });

  it('should search studies by condition', async () => {
    const studies: Array<unknown> = [];

    for await (const study of ct.searchStudies('COVID-19', { pageSize: 3 })) {
      studies.push(study);
      if (studies.length >= 3) {
        break;
      }
    }

    expect(studies.length).toBeGreaterThan(0);
    expect(studies.length).toBeLessThanOrEqual(3);
  });

  it('should return study stats', async () => {
    const stats = await ct.studyStats();

    expect(stats.totalStudies).toBeGreaterThan(0);
  });
});
