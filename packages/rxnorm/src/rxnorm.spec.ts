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
