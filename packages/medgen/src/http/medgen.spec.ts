import { afterEach, describe, expect, it, vi } from 'vitest';
import { MedGen } from './medgen';

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

function buildSearchResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    esearchresult: {
      count: '3',
      retmax: '20',
      retstart: '0',
      idlist: ['18145', '346221'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
): Record<string, unknown> {
  const uids = Object.keys(entries);
  return {
    result: {
      uids,
      ...entries,
    },
  };
}

const SAMPLE_CONCEPT_META = [
  '<Names>',
  '<Name SAB="MSH" type="preferred">Lowe Syndrome</Name>',
  '<Name SAB="OMIM" type="syn">Oculocerebrorenal Syndrome of Lowe</Name>',
  '</Names>',
  '<Definitions>',
  '<Definition source="NCI">A rare genetic disorder.</Definition>',
  '<Definition source="MSH">An X-linked condition.</Definition>',
  '</Definitions>',
  '<AssociatedGenes>',
  '<Gene gene_id="4952" chromosome="X" cytogen_loc="Xq26.1">OCRL</Gene>',
  '</AssociatedGenes>',
  '<ModesOfInheritance>',
  '<ModeOfInheritance uid="375779" CUI="C0241764" TUI="T033">',
  '<Name>X-linked recessive inheritance</Name>',
  '</ModeOfInheritance>',
  '</ModesOfInheritance>',
  '<ClinicalFeatures>',
  '<ClinicalFeature uid="1375" SDUI="HP:0001249" CUI="C3714756">',
  '<Name>Intellectual disability</Name>',
  '</ClinicalFeature>',
  '<ClinicalFeature uid="518" SDUI="HP:0000518" CUI="C0086543">',
  '<Name>Cataract</Name>',
  '</ClinicalFeature>',
  '</ClinicalFeatures>',
  '<OMIM><MIM>309000</MIM></OMIM>',
].join('');

function buildMedGenEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '18145',
    conceptid: 'C0028860',
    title: 'Lowe syndrome',
    definition: { value: 'An X-linked disorder characterized by cataracts.' },
    semantictype: { value: 'Disease or Syndrome' },
    conceptmeta: SAMPLE_CONCEPT_META,
    ...overrides,
  };
}

describe('MedGen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const medgen = new MedGen();

      const result = await medgen.search('Lowe syndrome');

      expect(result.total).toBe(3);
      expect(result.ids).toEqual(['18145', '346221']);
    });

    it('should build correct search URL', async () => {
      mockFetchJson(buildSearchResponse());
      const medgen = new MedGen();

      await medgen.search('cystic fibrosis');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=medgen');
      expect(url).toContain('retmode=json');
    });

    it('should include retmax when provided', async () => {
      mockFetchJson(buildSearchResponse());
      const medgen = new MedGen();

      await medgen.search('test', { retmax: 5 });

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('retmax=5');
    });

    it('should include credentials when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const medgen = new MedGen({
        apiKey: 'test-key',
        tool: 'my-tool',
        email: 'test@example.com',
      });

      await medgen.search('test');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('api_key=test-key');
      expect(url).toContain('tool=my-tool');
      expect(url).toContain('email=test%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const medgen = new MedGen();

      const result = await medgen.search('nonexistent');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch and parse concepts with full conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts).toHaveLength(1);
      const concept = concepts[0]!;
      expect(concept.uid).toBe('18145');
      expect(concept.conceptId).toBe('C0028860');
      expect(concept.title).toBe('Lowe syndrome');
      expect(concept.definition).toBe('An X-linked disorder characterized by cataracts.');
      expect(concept.semanticType).toBe('Disease or Syndrome');
    });

    it('should parse associated genes from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const genes = concepts[0]!.associatedGenes;

      expect(genes).toHaveLength(1);
      expect(genes[0]?.geneId).toBe(4952);
      expect(genes[0]?.symbol).toBe('OCRL');
      expect(genes[0]?.chromosome).toBe('X');
      expect(genes[0]?.cytogeneticLocation).toBe('Xq26.1');
    });

    it('should parse modes of inheritance from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const modes = concepts[0]!.modesOfInheritance;

      expect(modes).toHaveLength(1);
      expect(modes[0]?.name).toBe('X-linked recessive inheritance');
      expect(modes[0]?.cui).toBe('C0241764');
    });

    it('should parse clinical features from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const features = concepts[0]!.clinicalFeatures;

      expect(features).toHaveLength(2);
      expect(features[0]?.name).toBe('Intellectual disability');
      expect(features[0]?.hpoId).toBe('HP:0001249');
      expect(features[0]?.cui).toBe('C3714756');
      expect(features[1]?.name).toBe('Cataract');
    });

    it('should parse OMIM IDs from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts[0]!.omimIds).toEqual(['309000']);
    });

    it('should parse definitions from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const definitions = concepts[0]!.definitions;

      expect(definitions).toHaveLength(2);
      expect(definitions[0]?.source).toBe('NCI');
      expect(definitions[0]?.text).toBe('A rare genetic disorder.');
      expect(definitions[1]?.source).toBe('MSH');
    });

    it('should parse names from conceptmeta', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const names = concepts[0]!.names;

      expect(names).toHaveLength(2);
      expect(names[0]?.name).toBe('Lowe Syndrome');
      expect(names[0]?.source).toBe('MSH');
      expect(names[0]?.type).toBe('preferred');
      expect(names[1]?.name).toBe('Oculocerebrorenal Syndrome of Lowe');
      expect(names[1]?.type).toBe('syn');
    });

    it('should handle XML elements with missing attributes', async () => {
      const sparseXml = [
        '<AssociatedGenes><Gene>BRCA1</Gene></AssociatedGenes>',
        '<ModesOfInheritance>',
        '<ModeOfInheritance ></ModeOfInheritance>',
        '</ModesOfInheritance>',
        '<ClinicalFeatures>',
        '<ClinicalFeature ></ClinicalFeature>',
        '</ClinicalFeatures>',
        '<Definitions><Definition>Some definition</Definition></Definitions>',
        '<Names><Name>Some name</Name></Names>',
      ].join('');

      mockFetchJson(
        buildSummaryResponse({
          '18145': buildMedGenEntry({ conceptmeta: sparseXml }),
        }),
      );
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);
      const concept = concepts[0]!;

      expect(concept.associatedGenes[0]?.geneId).toBe(0);
      expect(concept.associatedGenes[0]?.symbol).toBe('BRCA1');
      expect(concept.associatedGenes[0]?.chromosome).toBe('');
      expect(concept.associatedGenes[0]?.cytogeneticLocation).toBe('');
      expect(concept.modesOfInheritance[0]?.name).toBe('');
      expect(concept.modesOfInheritance[0]?.cui).toBe('');
      expect(concept.clinicalFeatures[0]?.name).toBe('');
      expect(concept.clinicalFeatures[0]?.hpoId).toBe('');
      expect(concept.clinicalFeatures[0]?.cui).toBe('');
      expect(concept.definitions[0]?.source).toBe('');
      expect(concept.definitions[0]?.text).toBe('Some definition');
      expect(concept.names[0]?.source).toBe('');
      expect(concept.names[0]?.type).toBe('');
    });

    it('should handle empty conceptmeta', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '18145': buildMedGenEntry({ conceptmeta: '' }),
        }),
      );
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts[0]!.associatedGenes).toEqual([]);
      expect(concepts[0]!.modesOfInheritance).toEqual([]);
      expect(concepts[0]!.clinicalFeatures).toEqual([]);
      expect(concepts[0]!.omimIds).toEqual([]);
      expect(concepts[0]!.definitions).toEqual([]);
      expect(concepts[0]!.names).toEqual([]);
    });

    it('should handle missing conceptmeta', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '18145': { uid: '18145', conceptid: 'C0028860', title: 'Test' },
        }),
      );
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts[0]!.associatedGenes).toEqual([]);
      expect(concepts[0]!.definitions).toEqual([]);
    });

    it('should build correct fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({ '18145': buildMedGenEntry() }));
      const medgen = new MedGen();

      await medgen.fetch(['18145', '346221']);

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=medgen');
      expect(url).toContain('id=18145%2C346221');
    });

    it('should return empty array for empty ids', async () => {
      const medgen = new MedGen();

      const concepts = await medgen.fetch([]);

      expect(concepts).toEqual([]);
    });

    it('should skip entries with errors', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '18145': { error: 'some error' },
        }),
      );
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts).toEqual([]);
    });

    it('should skip non-object entries', async () => {
      mockFetchJson({
        result: {
          uids: ['18145'],
          '18145': 'not-an-object',
        },
      });
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts).toEqual([]);
    });

    it('should handle missing result', async () => {
      mockFetchJson({});
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '18145': { uid: '18145' },
        }),
      );
      const medgen = new MedGen();

      const concepts = await medgen.fetch(['18145']);

      expect(concepts[0]?.conceptId).toBe('');
      expect(concepts[0]?.title).toBe('');
      expect(concepts[0]?.definition).toBe('');
      expect(concepts[0]?.semanticType).toBe('');
    });
  });

  describe('searchAndFetch', () => {
    it('should search then fetch results', async () => {
      const searchResponse = buildSearchResponse({ idlist: ['18145'] });
      const summaryResponse = buildSummaryResponse({
        '18145': buildMedGenEntry(),
      });

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(searchResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(summaryResponse),
          }),
      );

      const medgen = new MedGen();
      const concepts = await medgen.searchAndFetch('Lowe syndrome');

      expect(concepts).toHaveLength(1);
      expect(concepts[0]?.title).toBe('Lowe syndrome');
    });

    it('should return empty array when search finds nothing', async () => {
      mockFetchJson(buildSearchResponse({ count: '0', idlist: [] }));
      const medgen = new MedGen();

      const concepts = await medgen.searchAndFetch('nonexistent');

      expect(concepts).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const medgen = new MedGen();

      await medgen.search('test');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).not.toContain('api_key');
    });
  });
});
