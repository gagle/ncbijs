import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClinicalTrials } from './clinical-trials';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function buildStudyResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    protocolSection: {
      identificationModule: {
        nctId: 'NCT00000001',
        briefTitle: 'Test Study',
        officialTitle: 'A Test Clinical Study',
      },
      statusModule: {
        overallStatus: 'COMPLETED',
        startDateStruct: { date: '2020-01-15' },
        completionDateStruct: { date: '2023-06-30' },
      },
      designModule: {
        phases: ['PHASE3'],
        studyType: 'INTERVENTIONAL',
        enrollmentInfo: { count: 500 },
      },
      conditionsModule: {
        conditions: ['Diabetes Mellitus, Type 2'],
      },
      armsInterventionsModule: {
        interventions: [{ type: 'DRUG', name: 'Metformin', description: 'Oral medication' }],
      },
      sponsorCollaboratorsModule: {
        leadSponsor: { name: 'NIH' },
        collaborators: [{ name: 'FDA' }],
      },
      contactsLocationsModule: {
        locations: [
          { facility: 'Hospital A', city: 'Bethesda', state: 'Maryland', country: 'United States' },
        ],
      },
      ...overrides,
    },
  };
}

describe('ClinicalTrials', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('study', () => {
    it('should fetch a study by NCT ID and map fields', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.nctId).toBe('NCT00000001');
      expect(study.briefTitle).toBe('Test Study');
      expect(study.officialTitle).toBe('A Test Clinical Study');
      expect(study.overallStatus).toBe('COMPLETED');
      expect(study.phase).toBe('PHASE3');
      expect(study.studyType).toBe('INTERVENTIONAL');
      expect(study.startDate).toBe('2020-01-15');
      expect(study.completionDate).toBe('2023-06-30');
      expect(study.enrollment).toBe(500);
      expect(study.conditions).toEqual(['Diabetes Mellitus, Type 2']);
    });

    it('should build correct URL with encoded NCT ID', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      await ct.study('NCT00000001');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const url = fetchCall[0] as string;
      expect(url).toBe('https://clinicaltrials.gov/api/v2/studies/NCT00000001');
    });

    it('should map interventions', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.interventions).toHaveLength(1);
      expect(study.interventions[0]!.type).toBe('DRUG');
      expect(study.interventions[0]!.name).toBe('Metformin');
      expect(study.interventions[0]!.description).toBe('Oral medication');
    });

    it('should map sponsors', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.sponsors).toHaveLength(2);
      expect(study.sponsors[0]!.name).toBe('NIH');
      expect(study.sponsors[0]!.role).toBe('lead');
      expect(study.sponsors[1]!.name).toBe('FDA');
      expect(study.sponsors[1]!.role).toBe('collaborator');
    });

    it('should map locations', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.locations).toHaveLength(1);
      expect(study.locations[0]!.facility).toBe('Hospital A');
      expect(study.locations[0]!.city).toBe('Bethesda');
      expect(study.locations[0]!.country).toBe('United States');
    });

    it('should handle missing protocolSection', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.nctId).toBe('');
      expect(study.briefTitle).toBe('');
      expect(study.conditions).toEqual([]);
      expect(study.interventions).toEqual([]);
      expect(study.sponsors).toEqual([]);
      expect(study.locations).toEqual([]);
    });

    it('should handle missing nested modules', async () => {
      mockFetchJson({ protocolSection: {} });
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.nctId).toBe('');
      expect(study.overallStatus).toBe('');
      expect(study.phase).toBe('');
      expect(study.enrollment).toBe(0);
    });

    it('should default missing intervention fields to empty strings', async () => {
      mockFetchJson(
        buildStudyResponse({
          armsInterventionsModule: {
            interventions: [{}],
          },
        }),
      );
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.interventions).toHaveLength(1);
      expect(study.interventions[0]!.type).toBe('');
      expect(study.interventions[0]!.name).toBe('');
      expect(study.interventions[0]!.description).toBe('');
    });

    it('should default missing location fields to empty strings', async () => {
      mockFetchJson(
        buildStudyResponse({
          contactsLocationsModule: {
            locations: [{}],
          },
        }),
      );
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.locations).toHaveLength(1);
      expect(study.locations[0]!.facility).toBe('');
      expect(study.locations[0]!.city).toBe('');
      expect(study.locations[0]!.state).toBe('');
      expect(study.locations[0]!.country).toBe('');
    });

    it('should handle collaborator with missing name', async () => {
      mockFetchJson(
        buildStudyResponse({
          sponsorCollaboratorsModule: {
            leadSponsor: { name: 'NIH' },
            collaborators: [{ name: 'FDA' }, {}],
          },
        }),
      );
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.sponsors).toHaveLength(2);
      expect(study.sponsors[0]!.name).toBe('NIH');
      expect(study.sponsors[1]!.name).toBe('FDA');
    });

    it('should handle missing lead sponsor name', async () => {
      mockFetchJson(
        buildStudyResponse({
          sponsorCollaboratorsModule: {
            leadSponsor: {},
            collaborators: [],
          },
        }),
      );
      const ct = new ClinicalTrials();

      const study = await ct.study('NCT00000001');

      expect(study.sponsors).toHaveLength(0);
    });
  });

  describe('searchStudies', () => {
    it('should yield studies from search results', async () => {
      mockFetchJson({
        studies: [buildStudyResponse()],
      });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes')) {
        studies.push(study);
      }

      expect(studies).toHaveLength(1);
    });

    it('should follow pagination tokens', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              studies: [buildStudyResponse()],
              nextPageToken: 'token123',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              studies: [
                buildStudyResponse({
                  identificationModule: {
                    nctId: 'NCT00000002',
                    briefTitle: 'Study 2',
                    officialTitle: '',
                  },
                }),
              ],
            }),
        });
      vi.stubGlobal('fetch', fetchMock);
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes')) {
        studies.push(study);
      }

      expect(studies).toHaveLength(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondUrl = fetchMock.mock.calls[1]![0] as string;
      expect(secondUrl).toContain('pageToken=token123');
    });

    it('should handle empty search results', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('nonexistent')) {
        studies.push(study);
      }

      expect(studies).toHaveLength(0);
    });

    it('should handle missing studies array', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('test')) {
        studies.push(study);
      }

      expect(studies).toHaveLength(0);
    });

    it('should set pageSize parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', { pageSize: 10 })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('pageSize=10');
    });

    it('should set sort parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', { sort: '@relevance' })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('sort=%40relevance');
    });

    it('should set fields parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        fields: ['NCTId', 'BriefTitle'],
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('fields=NCTId%2CBriefTitle');
    });

    it('should set filter.overallStatus parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { overallStatus: ['RECRUITING', 'COMPLETED'] },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.overallStatus=RECRUITING%2CCOMPLETED');
    });

    it('should join filter.condition with OR separator', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { condition: ['Diabetes', 'Obesity'] },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.cond=Diabetes+OR+Obesity');
    });

    it('should join filter.intervention with OR separator', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { intervention: ['Metformin', 'Insulin'] },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.intr=Metformin+OR+Insulin');
    });

    it('should set filter.sponsor parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { sponsor: 'NIH' },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.spons=NIH');
    });

    it('should set filter.phase parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { phase: ['PHASE1', 'PHASE2'] },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.phase=PHASE1%2CPHASE2');
    });

    it('should set filter.studyType parameter', async () => {
      mockFetchJson({ studies: [] });
      const ct = new ClinicalTrials();

      const studies: Array<unknown> = [];
      for await (const study of ct.searchStudies('diabetes', {
        filter: { studyType: 'INTERVENTIONAL' },
      })) {
        studies.push(study);
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.studyType=INTERVENTIONAL');
    });
  });

  describe('studyStats', () => {
    it('should return total study count', async () => {
      mockFetchJson({ totalStudies: 500000 });
      const ct = new ClinicalTrials();

      const stats = await ct.studyStats();

      expect(stats.totalStudies).toBe(500000);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ totalStudies: 0 });
      const ct = new ClinicalTrials();

      await ct.studyStats();

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://clinicaltrials.gov/api/v2/stats/size');
    });

    it('should handle missing totalStudies', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const stats = await ct.studyStats();

      expect(stats.totalStudies).toBe(0);
    });
  });

  describe('studyFieldValues', () => {
    it('should return field value counts from topValues', async () => {
      mockFetchJson({
        topValues: [
          { value: 'COMPLETED', studiesCount: 200000 },
          { value: 'RECRUITING', studiesCount: 50000 },
        ],
      });
      const ct = new ClinicalTrials();

      const values = await ct.studyFieldValues('OverallStatus');

      expect(values).toHaveLength(2);
      expect(values[0]!.value).toBe('COMPLETED');
      expect(values[0]!.count).toBe(200000);
      expect(values[1]!.value).toBe('RECRUITING');
    });

    it('should build correct URL with field as path param', async () => {
      mockFetchJson({ topValues: [] });
      const ct = new ClinicalTrials();

      await ct.studyFieldValues('OverallStatus');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://clinicaltrials.gov/api/v2/stats/fieldValues/OverallStatus');
    });

    it('should handle missing topValues', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const values = await ct.studyFieldValues('OverallStatus');

      expect(values).toEqual([]);
    });

    it('should handle entries with missing fields', async () => {
      mockFetchJson({ topValues: [{}] });
      const ct = new ClinicalTrials();

      const values = await ct.studyFieldValues('OverallStatus');

      expect(values[0]!.value).toBe('');
      expect(values[0]!.count).toBe(0);
    });
  });

  describe('studyMetadata', () => {
    it('should flatten tree nodes into field definitions', async () => {
      mockFetchJson([
        {
          name: 'protocolSection',
          piece: 'ProtocolSection',
          sourceType: 'STRUCT',
          children: [
            {
              name: 'identificationModule',
              piece: 'IdentificationModule',
              sourceType: 'STRUCT',
              children: [
                {
                  name: 'nctId',
                  piece: 'NCTId',
                  sourceType: 'STRING',
                },
              ],
            },
          ],
        },
      ]);
      const ct = new ClinicalTrials();

      const metadata = await ct.studyMetadata();

      expect(metadata.fields).toHaveLength(3);
      expect(metadata.fields[0]!.name).toBe('protocolSection');
      expect(metadata.fields[0]!.type).toBe('STRUCT');
      expect(metadata.fields[0]!.description).toBe('ProtocolSection');
      expect(metadata.fields[0]!.sourceField).toBe('protocolSection');
      expect(metadata.fields[0]!.isEnum).toBe(false);
      expect(metadata.fields[1]!.name).toBe('protocolSection.identificationModule');
      expect(metadata.fields[2]!.name).toBe('protocolSection.identificationModule.nctId');
      expect(metadata.fields[2]!.type).toBe('STRING');
      expect(metadata.fields[2]!.description).toBe('NCTId');
    });

    it('should mark ENUM sourceType as isEnum true', async () => {
      mockFetchJson([
        {
          name: 'overallStatus',
          piece: 'OverallStatus',
          sourceType: 'ENUM',
        },
      ]);
      const ct = new ClinicalTrials();

      const metadata = await ct.studyMetadata();

      expect(metadata.fields[0]!.isEnum).toBe(true);
    });

    it('should build correct URL', async () => {
      mockFetchJson([]);
      const ct = new ClinicalTrials();

      await ct.studyMetadata();

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://clinicaltrials.gov/api/v2/studies/metadata');
    });

    it('should handle empty array response', async () => {
      mockFetchJson([]);
      const ct = new ClinicalTrials();

      const metadata = await ct.studyMetadata();

      expect(metadata.fields).toEqual([]);
    });

    it('should default missing node properties', async () => {
      mockFetchJson([{}]);
      const ct = new ClinicalTrials();

      const metadata = await ct.studyMetadata();

      expect(metadata.fields[0]!.name).toBe('');
      expect(metadata.fields[0]!.type).toBe('');
      expect(metadata.fields[0]!.description).toBe('');
      expect(metadata.fields[0]!.sourceField).toBe('');
      expect(metadata.fields[0]!.isEnum).toBe(false);
    });
  });

  describe('enumValues', () => {
    it('should return enum values extracted from topValues', async () => {
      mockFetchJson({
        topValues: [
          { value: 'RECRUITING', studiesCount: 50000 },
          { value: 'COMPLETED', studiesCount: 200000 },
          { value: 'TERMINATED', studiesCount: 10000 },
        ],
      });
      const ct = new ClinicalTrials();

      const values = await ct.enumValues('OverallStatus');

      expect(values).toEqual(['RECRUITING', 'COMPLETED', 'TERMINATED']);
    });

    it('should build correct URL with encoded field', async () => {
      mockFetchJson({ topValues: [] });
      const ct = new ClinicalTrials();

      await ct.enumValues('OverallStatus');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://clinicaltrials.gov/api/v2/stats/fieldValues/OverallStatus');
    });

    it('should handle missing topValues', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const values = await ct.enumValues('OverallStatus');

      expect(values).toEqual([]);
    });

    it('should return empty array for empty topValues', async () => {
      mockFetchJson({ topValues: [] });
      const ct = new ClinicalTrials();

      const values = await ct.enumValues('Phase');

      expect(values).toEqual([]);
    });

    it('should default missing value to empty string', async () => {
      mockFetchJson({ topValues: [{}] });
      const ct = new ClinicalTrials();

      const values = await ct.enumValues('Phase');

      expect(values).toEqual(['']);
    });
  });

  describe('studySize', () => {
    it('should return total count for a query', async () => {
      mockFetchJson({ totalCount: 12345 });
      const ct = new ClinicalTrials();

      const count = await ct.studySize('diabetes');

      expect(count).toBe(12345);
    });

    it('should build correct URL with query', async () => {
      mockFetchJson({ totalCount: 0 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('countTotal=true');
      expect(url).toContain('pageSize=0');
      expect(url).toContain('query.term=diabetes');
    });

    it('should work without a query', async () => {
      mockFetchJson({ totalCount: 500000 });
      const ct = new ClinicalTrials();

      const count = await ct.studySize();

      expect(count).toBe(500000);
      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('query.term');
    });

    it('should handle missing totalCount', async () => {
      mockFetchJson({});
      const ct = new ClinicalTrials();

      const count = await ct.studySize('test');

      expect(count).toBe(0);
    });

    it('should apply filter.overallStatus', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { overallStatus: ['RECRUITING', 'COMPLETED'] });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.overallStatus=RECRUITING%2CCOMPLETED');
    });

    it('should apply filter.condition with OR separator', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { condition: ['Diabetes', 'Obesity'] });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.cond=Diabetes+OR+Obesity');
    });

    it('should apply filter.intervention with OR separator', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { intervention: ['Metformin', 'Insulin'] });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.intr=Metformin+OR+Insulin');
    });

    it('should apply filter.sponsor', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { sponsor: 'NIH' });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('query.spons=NIH');
    });

    it('should apply filter.phase', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { phase: ['PHASE1', 'PHASE2'] });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.phase=PHASE1%2CPHASE2');
    });

    it('should apply filter.studyType', async () => {
      mockFetchJson({ totalCount: 100 });
      const ct = new ClinicalTrials();

      await ct.studySize('diabetes', { studyType: 'INTERVENTIONAL' });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('filter.studyType=INTERVENTIONAL');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials();

      await ct.study('NCT00000001');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries', async () => {
      mockFetchJson(buildStudyResponse());
      const ct = new ClinicalTrials({ maxRetries: 5 });

      await ct.study('NCT00000001');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
