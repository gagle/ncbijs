import { afterEach, describe, expect, it, vi } from 'vitest';
import { RxNorm } from './rxnorm';

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

describe('RxNorm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('rxcui', () => {
    it('should return concept for a drug name', async () => {
      mockFetchJson({ idGroup: { name: 'aspirin', rxnormId: ['1191'] } });
      const rx = new RxNorm();

      const concept = await rx.rxcui('aspirin');

      expect(concept).toBeDefined();
      expect(concept!.rxcui).toBe('1191');
      expect(concept!.name).toBe('aspirin');
    });

    it('should build correct URL', async () => {
      mockFetchJson({ idGroup: { rxnormId: ['1191'] } });
      const rx = new RxNorm();

      await rx.rxcui('aspirin');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin');
    });

    it('should return undefined when no match', async () => {
      mockFetchJson({ idGroup: { name: 'notadrug' } });
      const rx = new RxNorm();

      const concept = await rx.rxcui('notadrug');

      expect(concept).toBeUndefined();
    });

    it('should handle missing idGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const concept = await rx.rxcui('test');

      expect(concept).toBeUndefined();
    });

    it('should return undefined when rxnormId array is empty', async () => {
      mockFetchJson({ idGroup: { name: 'aspirin', rxnormId: [] } });
      const rx = new RxNorm();

      const concept = await rx.rxcui('aspirin');

      expect(concept).toBeUndefined();
    });

    it('should default missing name in idGroup', async () => {
      mockFetchJson({ idGroup: { rxnormId: ['1191'] } });
      const rx = new RxNorm();

      const concept = await rx.rxcui('aspirin');

      expect(concept!.name).toBe('');
    });
  });

  describe('properties', () => {
    it('should fetch concept properties', async () => {
      mockFetchJson({
        properties: {
          rxcui: '1191',
          name: 'aspirin',
          synonym: 'ASA',
          tty: 'IN',
          language: 'ENG',
          suppress: 'N',
        },
      });
      const rx = new RxNorm();

      const props = await rx.properties('1191');

      expect(props.rxcui).toBe('1191');
      expect(props.name).toBe('aspirin');
      expect(props.synonym).toBe('ASA');
      expect(props.tty).toBe('IN');
    });

    it('should handle missing properties', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const props = await rx.properties('1191');

      expect(props.rxcui).toBe('');
      expect(props.name).toBe('');
      expect(props.synonym).toBe('');
      expect(props.tty).toBe('');
      expect(props.language).toBe('');
      expect(props.suppress).toBe('');
    });

    it('should handle partially missing properties', async () => {
      mockFetchJson({
        properties: {
          rxcui: '1191',
          name: 'aspirin',
        },
      });
      const rx = new RxNorm();

      const props = await rx.properties('1191');

      expect(props.rxcui).toBe('1191');
      expect(props.name).toBe('aspirin');
      expect(props.synonym).toBe('');
      expect(props.tty).toBe('');
      expect(props.language).toBe('');
      expect(props.suppress).toBe('');
    });
  });

  describe('relatedByType', () => {
    it('should return related concepts', async () => {
      mockFetchJson({
        relatedGroup: {
          conceptGroup: [
            {
              tty: 'SBD',
              conceptProperties: [
                { rxcui: '212033', name: 'aspirin 325 MG Oral Tablet', tty: 'SBD' },
              ],
            },
          ],
        },
      });
      const rx = new RxNorm();

      const related = await rx.relatedByType('1191', ['SBD']);

      expect(related).toHaveLength(1);
      expect(related[0]!.rxcui).toBe('212033');
      expect(related[0]!.name).toBe('aspirin 325 MG Oral Tablet');
    });

    it('should handle missing relatedGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const related = await rx.relatedByType('1191', ['SBD']);

      expect(related).toEqual([]);
    });

    it('should handle groups with missing conceptProperties', async () => {
      mockFetchJson({
        relatedGroup: {
          conceptGroup: [{ tty: 'SBD' }],
        },
      });
      const rx = new RxNorm();

      const related = await rx.relatedByType('1191', ['SBD']);

      expect(related).toEqual([]);
    });

    it('should default missing concept property fields', async () => {
      mockFetchJson({
        relatedGroup: {
          conceptGroup: [
            {
              conceptProperties: [{}],
            },
          ],
        },
      });
      const rx = new RxNorm();

      const related = await rx.relatedByType('1191', ['SBD']);

      expect(related).toHaveLength(1);
      expect(related[0]!.rxcui).toBe('');
      expect(related[0]!.name).toBe('');
      expect(related[0]!.tty).toBe('');
    });

    it('should handle missing conceptGroup in relatedGroup', async () => {
      mockFetchJson({
        relatedGroup: {},
      });
      const rx = new RxNorm();

      const related = await rx.relatedByType('1191', ['SBD']);

      expect(related).toEqual([]);
    });
  });

  describe('drugs', () => {
    it('should return drug group with concept groups', async () => {
      mockFetchJson({
        drugGroup: {
          name: 'aspirin',
          conceptGroup: [
            {
              tty: 'SBD',
              conceptProperties: [
                { rxcui: '212033', name: 'aspirin 325 MG Oral Tablet', tty: 'SBD' },
              ],
            },
          ],
        },
      });
      const rx = new RxNorm();

      const group = await rx.drugs('aspirin');

      expect(group.name).toBe('aspirin');
      expect(group.conceptGroup).toHaveLength(1);
      expect(group.conceptGroup[0]!.tty).toBe('SBD');
    });

    it('should handle missing drugGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const group = await rx.drugs('test');

      expect(group.name).toBe('');
      expect(group.conceptGroup).toEqual([]);
    });

    it('should default missing fields in concept groups', async () => {
      mockFetchJson({
        drugGroup: {
          name: 'aspirin',
          conceptGroup: [{ conceptProperties: [{}] }],
        },
      });
      const rx = new RxNorm();

      const group = await rx.drugs('aspirin');

      expect(group.conceptGroup[0]!.tty).toBe('');
      expect(group.conceptGroup[0]!.conceptProperties[0]!.rxcui).toBe('');
      expect(group.conceptGroup[0]!.conceptProperties[0]!.name).toBe('');
      expect(group.conceptGroup[0]!.conceptProperties[0]!.tty).toBe('');
    });

    it('should handle concept group with missing conceptProperties', async () => {
      mockFetchJson({
        drugGroup: {
          name: 'aspirin',
          conceptGroup: [{ tty: 'SBD' }],
        },
      });
      const rx = new RxNorm();

      const group = await rx.drugs('aspirin');

      expect(group.conceptGroup[0]!.tty).toBe('SBD');
      expect(group.conceptGroup[0]!.conceptProperties).toEqual([]);
    });
  });

  describe('spelling', () => {
    it('should return spelling suggestions', async () => {
      mockFetchJson({
        suggestionGroup: {
          suggestionList: {
            suggestion: ['aspirin', 'aspirin butalbital caffeine'],
          },
        },
      });
      const rx = new RxNorm();

      const suggestions = await rx.spelling('asprin');

      expect(suggestions).toEqual(['aspirin', 'aspirin butalbital caffeine']);
    });

    it('should handle missing suggestionGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const suggestions = await rx.spelling('test');

      expect(suggestions).toEqual([]);
    });

    it('should handle missing suggestionList', async () => {
      mockFetchJson({ suggestionGroup: {} });
      const rx = new RxNorm();

      const suggestions = await rx.spelling('test');

      expect(suggestions).toEqual([]);
    });

    it('should handle missing suggestion array', async () => {
      mockFetchJson({ suggestionGroup: { suggestionList: {} } });
      const rx = new RxNorm();

      const suggestions = await rx.spelling('test');

      expect(suggestions).toEqual([]);
    });
  });

  describe('interaction', () => {
    it('should return drug interactions', async () => {
      mockFetchJson({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    description: 'Increased bleeding risk',
                    severity: 'high',
                    interactionConcept: [
                      {
                        minConceptItem: { rxcui: '1191', name: 'aspirin', tty: 'IN' },
                        sourceConceptItem: { id: 'DB00945', name: 'Aspirin' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toHaveLength(1);
      expect(interactions[0]!.description).toBe('Increased bleeding risk');
      expect(interactions[0]!.severity).toBe('high');
      expect(interactions[0]!.interactionConcept[0]!.rxcui).toBe('1191');
    });

    it('should handle missing interactionTypeGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toEqual([]);
    });

    it('should default missing interaction pair fields', async () => {
      mockFetchJson({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    interactionConcept: [{}],
                  },
                ],
              },
            ],
          },
        ],
      });
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toHaveLength(1);
      expect(interactions[0]!.description).toBe('');
      expect(interactions[0]!.severity).toBe('');
      expect(interactions[0]!.interactionConcept[0]!.rxcui).toBe('');
      expect(interactions[0]!.interactionConcept[0]!.name).toBe('');
      expect(interactions[0]!.interactionConcept[0]!.tty).toBe('');
      expect(interactions[0]!.interactionConcept[0]!.sourceConceptId).toBe('');
      expect(interactions[0]!.interactionConcept[0]!.sourceConceptName).toBe('');
    });

    it('should handle missing interactionType array', async () => {
      mockFetchJson({
        interactionTypeGroup: [{}],
      });
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toEqual([]);
    });

    it('should handle missing interactionPair array', async () => {
      mockFetchJson({
        interactionTypeGroup: [
          {
            interactionType: [{}],
          },
        ],
      });
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toEqual([]);
    });

    it('should handle missing interactionConcept array in pair', async () => {
      mockFetchJson({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    description: 'test',
                    severity: 'high',
                  },
                ],
              },
            ],
          },
        ],
      });
      const rx = new RxNorm();

      const interactions = await rx.interaction('1191');

      expect(interactions).toHaveLength(1);
      expect(interactions[0]!.interactionConcept).toEqual([]);
    });
  });

  describe('ndcByRxcui', () => {
    it('should return NDC codes', async () => {
      mockFetchJson({
        ndcGroup: {
          ndcList: {
            ndc: ['00904-6981-61', '00904-6981-80'],
          },
        },
      });
      const rx = new RxNorm();

      const ndcs = await rx.ndcByRxcui('1191');

      expect(ndcs).toEqual(['00904-6981-61', '00904-6981-80']);
    });

    it('should handle missing ndcGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const ndcs = await rx.ndcByRxcui('1191');

      expect(ndcs).toEqual([]);
    });

    it('should handle missing ndcList', async () => {
      mockFetchJson({ ndcGroup: {} });
      const rx = new RxNorm();

      const ndcs = await rx.ndcByRxcui('1191');

      expect(ndcs).toEqual([]);
    });

    it('should handle missing ndc array', async () => {
      mockFetchJson({ ndcGroup: { ndcList: {} } });
      const rx = new RxNorm();

      const ndcs = await rx.ndcByRxcui('1191');

      expect(ndcs).toEqual([]);
    });
  });

  describe('approximateTerm', () => {
    it('should return ranked candidates', async () => {
      mockFetchJson({
        approximateGroup: {
          candidate: [
            { rxcui: '1191', name: 'aspirin', score: '75', rank: '1' },
            { rxcui: '212033', name: 'aspirin 325 MG Oral Tablet', score: '50', rank: '2' },
          ],
        },
      });
      const rx = new RxNorm();

      const candidates = await rx.approximateTerm('asprin');

      expect(candidates).toHaveLength(2);
      expect(candidates[0]!.rxcui).toBe('1191');
      expect(candidates[0]!.name).toBe('aspirin');
      expect(candidates[0]!.score).toBe(75);
      expect(candidates[0]!.rank).toBe(1);
      expect(candidates[1]!.rxcui).toBe('212033');
      expect(candidates[1]!.score).toBe(50);
      expect(candidates[1]!.rank).toBe(2);
    });

    it('should build correct URL without options', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      await rx.approximateTerm('asprin');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=asprin');
    });

    it('should build correct URL with maxEntries', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      await rx.approximateTerm('asprin', { maxEntries: 5 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=asprin&maxEntries=5',
      );
    });

    it('should build correct URL with option', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      await rx.approximateTerm('asprin', { option: 1 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=asprin&option=1');
    });

    it('should build correct URL with all options', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      await rx.approximateTerm('asprin', { maxEntries: 10, option: 0 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=asprin&maxEntries=10&option=0',
      );
    });

    it('should encode special characters in term', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      await rx.approximateTerm('drug name & more');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('term=drug%20name%20%26%20more');
    });

    it('should handle missing approximateGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const candidates = await rx.approximateTerm('notadrug');

      expect(candidates).toEqual([]);
    });

    it('should handle missing candidate array', async () => {
      mockFetchJson({ approximateGroup: {} });
      const rx = new RxNorm();

      const candidates = await rx.approximateTerm('notadrug');

      expect(candidates).toEqual([]);
    });

    it('should default missing candidate fields', async () => {
      mockFetchJson({
        approximateGroup: {
          candidate: [{}],
        },
      });
      const rx = new RxNorm();

      const candidates = await rx.approximateTerm('test');

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.rxcui).toBe('');
      expect(candidates[0]!.name).toBe('');
      expect(candidates[0]!.score).toBe(0);
      expect(candidates[0]!.rank).toBe(0);
    });
  });

  describe('history', () => {
    it('should return concept history', async () => {
      mockFetchJson({
        rxcuiStatusHistory: {
          metaData: {
            rxcui: '1191',
            name: 'aspirin',
            status: 'Active',
          },
          derivedConcepts: {
            remappedTo: [],
          },
        },
      });
      const rx = new RxNorm();

      const result = await rx.history('1191');

      expect(result.rxcui).toBe('1191');
      expect(result.name).toBe('aspirin');
      expect(result.status).toBe('Active');
      expect(result.remappedTo).toEqual([]);
    });

    it('should build correct URL', async () => {
      mockFetchJson({ rxcuiStatusHistory: {} });
      const rx = new RxNorm();

      await rx.history('1191');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://rxnav.nlm.nih.gov/REST/rxcui/1191/historystatus.json');
    });

    it('should return remapped RxCUIs', async () => {
      mockFetchJson({
        rxcuiStatusHistory: {
          metaData: {
            rxcui: '100',
            name: 'old drug',
            status: 'Remapped',
          },
          derivedConcepts: {
            remappedTo: [{ rxcui: '200' }, { rxcui: '300' }],
          },
        },
      });
      const rx = new RxNorm();

      const result = await rx.history('100');

      expect(result.remappedTo).toEqual(['200', '300']);
    });

    it('should filter out remapped entries without rxcui', async () => {
      mockFetchJson({
        rxcuiStatusHistory: {
          metaData: { rxcui: '100', name: 'test', status: 'Remapped' },
          derivedConcepts: {
            remappedTo: [{ rxcui: '200' }, {}, { rxcui: '300' }],
          },
        },
      });
      const rx = new RxNorm();

      const result = await rx.history('100');

      expect(result.remappedTo).toEqual(['200', '300']);
    });

    it('should handle missing rxcuiStatusHistory', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const result = await rx.history('1191');

      expect(result.rxcui).toBe('');
      expect(result.name).toBe('');
      expect(result.status).toBe('');
      expect(result.remappedTo).toEqual([]);
    });

    it('should handle missing metaData', async () => {
      mockFetchJson({ rxcuiStatusHistory: {} });
      const rx = new RxNorm();

      const result = await rx.history('1191');

      expect(result.rxcui).toBe('');
      expect(result.name).toBe('');
      expect(result.status).toBe('');
    });

    it('should handle missing derivedConcepts', async () => {
      mockFetchJson({
        rxcuiStatusHistory: {
          metaData: { rxcui: '1191', name: 'aspirin', status: 'Active' },
        },
      });
      const rx = new RxNorm();

      const result = await rx.history('1191');

      expect(result.remappedTo).toEqual([]);
    });

    it('should handle missing remappedTo array', async () => {
      mockFetchJson({
        rxcuiStatusHistory: {
          metaData: { rxcui: '1191', name: 'aspirin', status: 'Active' },
          derivedConcepts: {},
        },
      });
      const rx = new RxNorm();

      const result = await rx.history('1191');

      expect(result.remappedTo).toEqual([]);
    });
  });

  describe('allProperties', () => {
    it('should return properties for an RxCUI', async () => {
      mockFetchJson({
        propConceptGroup: {
          propConcept: [
            { propCategory: 'NAMES', propName: 'RxNorm Name', propValue: 'aspirin' },
            { propCategory: 'SOURCES', propName: 'Source', propValue: 'RXNORM' },
          ],
        },
      });
      const rx = new RxNorm();

      const props = await rx.allProperties('1191', ['NAMES', 'SOURCES']);

      expect(props).toHaveLength(2);
      expect(props[0]!.category).toBe('NAMES');
      expect(props[0]!.name).toBe('RxNorm Name');
      expect(props[0]!.value).toBe('aspirin');
      expect(props[1]!.category).toBe('SOURCES');
    });

    it('should build correct URL with encoded categories', async () => {
      mockFetchJson({ propConceptGroup: {} });
      const rx = new RxNorm();

      await rx.allProperties('1191', ['NAMES', 'SOURCES']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://rxnav.nlm.nih.gov/REST/rxcui/1191/allProperties.json?prop=NAMES%2BSOURCES',
      );
    });

    it('should handle missing propConceptGroup', async () => {
      mockFetchJson({});
      const rx = new RxNorm();

      const props = await rx.allProperties('1191', ['NAMES']);

      expect(props).toEqual([]);
    });

    it('should handle missing propConcept array', async () => {
      mockFetchJson({ propConceptGroup: {} });
      const rx = new RxNorm();

      const props = await rx.allProperties('1191', ['NAMES']);

      expect(props).toEqual([]);
    });

    it('should default missing property fields', async () => {
      mockFetchJson({
        propConceptGroup: {
          propConcept: [{}],
        },
      });
      const rx = new RxNorm();

      const props = await rx.allProperties('1191', ['NAMES']);

      expect(props).toHaveLength(1);
      expect(props[0]!.category).toBe('');
      expect(props[0]!.name).toBe('');
      expect(props[0]!.value).toBe('');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson({ idGroup: { rxnormId: ['1191'] } });
      const rx = new RxNorm();

      await rx.rxcui('aspirin');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries', async () => {
      mockFetchJson({ idGroup: { rxnormId: ['1191'] } });
      const rx = new RxNorm({ maxRetries: 5 });

      await rx.rxcui('aspirin');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
