import { describe, expect, it } from 'vitest';
import { parseClinicalTrialJson } from './parse-clinical-trial-json';

const STUDY_ASPIRIN = {
  protocolSection: {
    identificationModule: {
      nctId: 'NCT00000001',
      briefTitle: 'Aspirin Trial',
      officialTitle: 'A Study of Aspirin in Healthy Adults',
    },
    statusModule: {
      overallStatus: 'Completed',
      startDateStruct: { date: '2020-01-15' },
      completionDateStruct: { date: '2022-06-30' },
    },
    designModule: {
      phases: ['Phase 3'],
      studyType: 'Interventional',
      enrollmentInfo: { count: 500 },
    },
    conditionsModule: {
      conditions: ['Pain', 'Fever'],
    },
    armsInterventionsModule: {
      interventions: [{ type: 'Drug', name: 'Aspirin', description: 'Low-dose aspirin 81mg' }],
    },
    sponsorCollaboratorsModule: {
      leadSponsor: { name: 'NIH' },
      collaborators: [{ name: 'Mayo Clinic' }],
    },
    contactsLocationsModule: {
      locations: [
        {
          facility: 'Mayo Clinic',
          city: 'Rochester',
          state: 'Minnesota',
          country: 'United States',
        },
      ],
    },
  },
};

const STUDY_MINIMAL = {
  protocolSection: {
    identificationModule: {
      nctId: 'NCT00000002',
      briefTitle: 'Minimal Study',
    },
  },
};

describe('parseClinicalTrialJson', () => {
  describe('JSON array input', () => {
    it('parses an array of studies', () => {
      const json = JSON.stringify([STUDY_ASPIRIN, STUDY_MINIMAL]);
      const result = parseClinicalTrialJson(json);

      expect(result).toHaveLength(2);
    });

    it('extracts identification fields', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.nctId).toBe('NCT00000001');
      expect(result[0]!.briefTitle).toBe('Aspirin Trial');
      expect(result[0]!.officialTitle).toBe('A Study of Aspirin in Healthy Adults');
    });

    it('extracts status fields', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.overallStatus).toBe('Completed');
      expect(result[0]!.startDate).toBe('2020-01-15');
      expect(result[0]!.completionDate).toBe('2022-06-30');
    });

    it('extracts design fields', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.phase).toBe('Phase 3');
      expect(result[0]!.studyType).toBe('Interventional');
      expect(result[0]!.enrollment).toBe(500);
    });

    it('extracts conditions', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.conditions).toEqual(['Pain', 'Fever']);
    });

    it('extracts interventions', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.interventions).toEqual([
        { type: 'Drug', name: 'Aspirin', description: 'Low-dose aspirin 81mg' },
      ]);
    });

    it('extracts sponsors with roles', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.sponsors).toEqual([
        { name: 'NIH', role: 'lead' },
        { name: 'Mayo Clinic', role: 'collaborator' },
      ]);
    });

    it('extracts locations', () => {
      const json = JSON.stringify([STUDY_ASPIRIN]);
      const result = parseClinicalTrialJson(json);

      expect(result[0]!.locations).toEqual([
        {
          facility: 'Mayo Clinic',
          city: 'Rochester',
          state: 'Minnesota',
          country: 'United States',
        },
      ]);
    });
  });

  describe('minimal study', () => {
    it('defaults missing fields', () => {
      const json = JSON.stringify([STUDY_MINIMAL]);
      const result = parseClinicalTrialJson(json);
      const study = result[0]!;

      expect(study.nctId).toBe('NCT00000002');
      expect(study.briefTitle).toBe('Minimal Study');
      expect(study.officialTitle).toBe('');
      expect(study.overallStatus).toBe('');
      expect(study.phase).toBe('');
      expect(study.studyType).toBe('');
      expect(study.startDate).toBe('');
      expect(study.completionDate).toBe('');
      expect(study.enrollment).toBe(0);
      expect(study.conditions).toEqual([]);
      expect(study.interventions).toEqual([]);
      expect(study.sponsors).toEqual([]);
      expect(study.locations).toEqual([]);
    });
  });

  describe('NDJSON input', () => {
    it('parses newline-delimited JSON', () => {
      const ndjson = [JSON.stringify(STUDY_ASPIRIN), JSON.stringify(STUDY_MINIMAL)].join('\n');
      const result = parseClinicalTrialJson(ndjson);

      expect(result).toHaveLength(2);
      expect(result[0]!.nctId).toBe('NCT00000001');
      expect(result[1]!.nctId).toBe('NCT00000002');
    });

    it('skips blank lines in NDJSON', () => {
      const ndjson = [JSON.stringify(STUDY_ASPIRIN), '', JSON.stringify(STUDY_MINIMAL)].join('\n');
      const result = parseClinicalTrialJson(ndjson);

      expect(result).toHaveLength(2);
    });

    it('skips malformed lines in NDJSON', () => {
      const ndjson = [
        JSON.stringify(STUDY_ASPIRIN),
        '{invalid json}',
        JSON.stringify(STUDY_MINIMAL),
      ].join('\n');
      const result = parseClinicalTrialJson(ndjson);

      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(parseClinicalTrialJson('')).toEqual([]);
    });

    it('returns empty array for whitespace input', () => {
      expect(parseClinicalTrialJson('   ')).toEqual([]);
    });

    it('returns empty array for invalid JSON array', () => {
      expect(parseClinicalTrialJson('[invalid')).toEqual([]);
    });

    it('parses a single JSON object as NDJSON', () => {
      const json = JSON.stringify(STUDY_MINIMAL);
      const result = parseClinicalTrialJson(json);

      expect(result).toHaveLength(1);
      expect(result[0]!.nctId).toBe('NCT00000002');
    });

    it('joins multiple phases with slash', () => {
      const study = {
        protocolSection: {
          identificationModule: { nctId: 'NCT00000003' },
          designModule: { phases: ['Phase 2', 'Phase 3'] },
        },
      };
      const result = parseClinicalTrialJson(JSON.stringify([study]));

      expect(result[0]!.phase).toBe('Phase 2/Phase 3');
    });
  });
});
