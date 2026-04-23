import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClinVar } from './clinvar';

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
      count: '5',
      retmax: '20',
      retstart: '0',
      idlist: ['846933', '123456'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
  uids?: ReadonlyArray<string>,
): Record<string, unknown> {
  const entryUids = uids ?? Object.keys(entries);
  return {
    result: {
      uids: entryUids,
      ...entries,
    },
  };
}

function buildVariantEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '846933',
    title: 'NM_000546.6(TP53):c.743G>A (p.Arg248Gln)',
    obj_type: 'single nucleotide variant',
    accession: 'VCV000846933',
    accession_version: 'VCV000846933.1',
    clinical_significance: { description: 'Pathogenic/Likely pathogenic' },
    gene_sort: 'TP53',
    genes: [{ geneid: 7157, symbol: 'TP53' }],
    trait_set: [
      {
        trait_name: 'Li-Fraumeni syndrome',
        trait_xrefs: [{ db_source: 'MedGen', db_id: 'C0023357' }],
      },
    ],
    variation_set: [
      {
        variation_loc: [
          {
            assembly_name: 'GRCh38',
            chr: '17',
            start: 7674221,
            stop: 7674221,
          },
        ],
      },
    ],
    supporting_submissions: { scv: ['SCV000987654'] },
    ...overrides,
  };
}

describe('ClinVar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar();

      const result = await clinvar.search('TP53');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['846933', '123456']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar();

      await clinvar.search('BRCA1 pathogenic');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=clinvar');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=BRCA1+pathogenic');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar();

      await clinvar.search('TP53', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar();

      await clinvar.search('TP53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar({ apiKey: 'test-key' });

      await clinvar.search('TP53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar({ tool: 'my-app', email: 'user@example.com' });

      await clinvar.search('TP53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const result = await clinvar.search('TP53');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const clinvar = new ClinVar();

      const result = await clinvar.search('TP53');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch variant details and map all fields', async () => {
      const entry = buildVariantEntry();
      mockFetchJson(buildSummaryResponse({ '846933': entry as Record<string, unknown> }));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.uid).toBe('846933');
      expect(reports[0]!.title).toBe('NM_000546.6(TP53):c.743G>A (p.Arg248Gln)');
      expect(reports[0]!.objectType).toBe('single nucleotide variant');
      expect(reports[0]!.accession).toBe('VCV000846933');
      expect(reports[0]!.accessionVersion).toBe('VCV000846933.1');
      expect(reports[0]!.clinicalSignificance).toBe('Pathogenic/Likely pathogenic');
    });

    it('should map gene fields', async () => {
      const entry = buildVariantEntry();
      mockFetchJson(buildSummaryResponse({ '846933': entry as Record<string, unknown> }));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports[0]!.genes).toHaveLength(1);
      expect(reports[0]!.genes[0]!.geneId).toBe(7157);
      expect(reports[0]!.genes[0]!.symbol).toBe('TP53');
    });

    it('should map trait fields with xrefs', async () => {
      const entry = buildVariantEntry();
      mockFetchJson(buildSummaryResponse({ '846933': entry as Record<string, unknown> }));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports[0]!.traits).toHaveLength(1);
      expect(reports[0]!.traits[0]!.name).toBe('Li-Fraumeni syndrome');
      expect(reports[0]!.traits[0]!.xrefs).toHaveLength(1);
      expect(reports[0]!.traits[0]!.xrefs[0]!.dbSource).toBe('MedGen');
      expect(reports[0]!.traits[0]!.xrefs[0]!.dbId).toBe('C0023357');
    });

    it('should map variant location fields', async () => {
      const entry = buildVariantEntry();
      mockFetchJson(buildSummaryResponse({ '846933': entry as Record<string, unknown> }));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports[0]!.locations).toHaveLength(1);
      expect(reports[0]!.locations[0]!.assemblyName).toBe('GRCh38');
      expect(reports[0]!.locations[0]!.chromosome).toBe('17');
      expect(reports[0]!.locations[0]!.start).toBe(7674221);
      expect(reports[0]!.locations[0]!.stop).toBe(7674221);
    });

    it('should map supporting submissions', async () => {
      const entry = buildVariantEntry();
      mockFetchJson(buildSummaryResponse({ '846933': entry as Record<string, unknown> }));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports[0]!.supportingSubmissions).toEqual(['SCV000987654']);
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const clinvar = new ClinVar();

      await clinvar.fetch(['846933', '123456']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=clinvar');
      expect(url).toContain('id=846933%2C123456');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch([]);

      expect(reports).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildVariantEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '846933': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['846933', '999'],
        ),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933', '999']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.uid).toBe('846933');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933']);

      expect(reports).toEqual([]);
    });

    it('should handle variant with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.uid).toBe('1');
      expect(reports[0]!.title).toBe('');
      expect(reports[0]!.objectType).toBe('');
      expect(reports[0]!.accession).toBe('');
      expect(reports[0]!.accessionVersion).toBe('');
      expect(reports[0]!.clinicalSignificance).toBe('');
      expect(reports[0]!.genes).toEqual([]);
      expect(reports[0]!.traits).toEqual([]);
      expect(reports[0]!.locations).toEqual([]);
      expect(reports[0]!.supportingSubmissions).toEqual([]);
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { title: 'some variant' } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.uid).toBe('');
      expect(reports[0]!.title).toBe('some variant');
    });

    it('should handle gene with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', genes: [{}] } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.genes[0]!.geneId).toBe(0);
      expect(reports[0]!.genes[0]!.symbol).toBe('');
    });

    it('should handle trait with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', trait_set: [{}] } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.traits[0]!.name).toBe('');
      expect(reports[0]!.traits[0]!.xrefs).toEqual([]);
    });

    it('should handle trait xref with missing fields', async () => {
      mockFetchJson(
        buildSummaryResponse({ '1': { uid: '1', trait_set: [{ trait_xrefs: [{}] }] } }, ['1']),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.traits[0]!.xrefs[0]!.dbSource).toBe('');
      expect(reports[0]!.traits[0]!.xrefs[0]!.dbId).toBe('');
    });

    it('should handle variation set with missing location', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', variation_set: [{}] } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.locations).toEqual([]);
    });

    it('should handle location with missing fields', async () => {
      mockFetchJson(
        buildSummaryResponse({ '1': { uid: '1', variation_set: [{ variation_loc: [{}] }] } }, [
          '1',
        ]),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.locations[0]!.assemblyName).toBe('');
      expect(reports[0]!.locations[0]!.chromosome).toBe('');
      expect(reports[0]!.locations[0]!.start).toBe(0);
      expect(reports[0]!.locations[0]!.stop).toBe(0);
    });

    it('should flatten locations from multiple variation sets', async () => {
      mockFetchJson(
        buildSummaryResponse(
          {
            '1': {
              uid: '1',
              variation_set: [
                { variation_loc: [{ assembly_name: 'GRCh38', chr: '17', start: 100, stop: 200 }] },
                { variation_loc: [{ assembly_name: 'GRCh37', chr: '17', start: 50, stop: 150 }] },
              ],
            },
          },
          ['1'],
        ),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.locations).toHaveLength(2);
      expect(reports[0]!.locations[0]!.assemblyName).toBe('GRCh38');
      expect(reports[0]!.locations[1]!.assemblyName).toBe('GRCh37');
    });

    it('should handle missing clinical_significance description', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', clinical_significance: {} } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.clinicalSignificance).toBe('');
    });

    it('should handle missing supporting_submissions scv', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', supporting_submissions: {} } }, ['1']));
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.supportingSubmissions).toEqual([]);
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['846933', '999'],
          '846933': buildVariantEntry(),
        },
      });
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['846933', '999']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.uid).toBe('846933');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch variant reports in one call', async () => {
      const entry = buildVariantEntry();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              buildSummaryResponse({ '846933': entry as Record<string, unknown> }, ['846933']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const clinvar = new ClinVar();

      const reports = await clinvar.searchAndFetch('TP53');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.uid).toBe('846933');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const clinvar = new ClinVar();

      const reports = await clinvar.searchAndFetch('nonexistent_variant_xyz');

      expect(reports).toEqual([]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should pass retmax option to search', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSummaryResponse({}, [])),
        });
      vi.stubGlobal('fetch', fetchMock);
      const clinvar = new ClinVar();

      await clinvar.searchAndFetch('TP53', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('refsnp', () => {
    it('should build correct URL with rsID', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.refsnp(328);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/328');
    });

    it('should map RefSNP response with placements and alleles', async () => {
      mockFetchJson({
        primary_snapshot_data: {
          variant_type: 'snv',
          placements_with_allele: [
            {
              seq_id: 'NC_000001.11',
              alleles: [
                {
                  allele: {
                    spdi: {
                      seq_id: 'NC_000001.11',
                      position: 1014042,
                      deleted_sequence: 'C',
                      inserted_sequence: 'T',
                    },
                  },
                  hgvs: 'NC_000001.11:g.1014043C>T',
                },
              ],
            },
          ],
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.rsid).toBe(328);
      expect(report.variantType).toBe('snv');
      expect(report.placements).toHaveLength(1);
      expect(report.placements[0]!.sequenceAccession).toBe('NC_000001.11');
      expect(report.placements[0]!.alleles).toHaveLength(1);
      expect(report.placements[0]!.alleles[0]!.spdi).toBe('NC_000001.11:1014042:C:T');
      expect(report.placements[0]!.alleles[0]!.hgvs).toBe('NC_000001.11:g.1014043C>T');
    });

    it('should handle missing primary_snapshot_data', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.rsid).toBe(328);
      expect(report.variantType).toBe('');
      expect(report.placements).toEqual([]);
    });

    it('should handle missing variant_type and placements', async () => {
      mockFetchJson({ primary_snapshot_data: {} });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.variantType).toBe('');
      expect(report.placements).toEqual([]);
    });

    it('should handle placement with missing fields', async () => {
      mockFetchJson({
        primary_snapshot_data: {
          placements_with_allele: [{}],
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.placements[0]!.sequenceAccession).toBe('');
      expect(report.placements[0]!.alleles).toEqual([]);
    });

    it('should handle allele with missing spdi and hgvs', async () => {
      mockFetchJson({
        primary_snapshot_data: {
          placements_with_allele: [{ alleles: [{}] }],
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.placements[0]!.alleles[0]!.spdi).toBe('');
      expect(report.placements[0]!.alleles[0]!.hgvs).toBe('');
    });

    it('should handle allele with empty spdi object', async () => {
      mockFetchJson({
        primary_snapshot_data: {
          placements_with_allele: [{ alleles: [{ allele: { spdi: {} } }] }],
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.placements[0]!.alleles[0]!.spdi).toBe(':0::');
    });

    it('should handle allele with allele object but no spdi', async () => {
      mockFetchJson({
        primary_snapshot_data: {
          placements_with_allele: [{ alleles: [{ allele: {} }] }],
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.refsnp(328);

      expect(report.placements[0]!.alleles[0]!.spdi).toBe('');
    });
  });

  describe('spdi', () => {
    it('should build correct URL with encoded SPDI expression', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.spdi('NC_000001.11:1014042:C:T');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://api.ncbi.nlm.nih.gov/variation/v0/spdi/NC_000001.11%3A1014042%3AC%3AT',
      );
    });

    it('should map SPDI response fields', async () => {
      mockFetchJson({
        data: {
          seq_id: 'NC_000001.11',
          position: 1014042,
          deleted_sequence: 'C',
          inserted_sequence: 'T',
        },
      });
      const clinvar = new ClinVar();

      const result = await clinvar.spdi('NC_000001.11:1014042:C:T');

      expect(result.sequenceAccession).toBe('NC_000001.11');
      expect(result.position).toBe(1014042);
      expect(result.deletedSequence).toBe('C');
      expect(result.insertedSequence).toBe('T');
    });

    it('should handle missing data', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const result = await clinvar.spdi('NC_000001.11:1014042:C:T');

      expect(result.sequenceAccession).toBe('');
      expect(result.position).toBe(0);
      expect(result.deletedSequence).toBe('');
      expect(result.insertedSequence).toBe('');
    });

    it('should handle data with missing fields', async () => {
      mockFetchJson({ data: {} });
      const clinvar = new ClinVar();

      const result = await clinvar.spdi('NC_000001.11:1014042:C:T');

      expect(result.sequenceAccession).toBe('');
      expect(result.position).toBe(0);
      expect(result.deletedSequence).toBe('');
      expect(result.insertedSequence).toBe('');
    });
  });

  describe('spdiToHgvs', () => {
    it('should build correct URL with encoded SPDI expression', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://api.ncbi.nlm.nih.gov/variation/v0/spdi/NC_000001.11%3A1014042%3AC%3AT/hgvs',
      );
    });

    it('should return HGVS expressions', async () => {
      mockFetchJson({
        data: {
          hgvsExpression: ['NC_000001.11:g.1014043C>T', 'NG_007400.1:g.7894C>T'],
        },
      });
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toEqual(['NC_000001.11:g.1014043C>T', 'NG_007400.1:g.7894C>T']);
    });

    it('should handle missing data', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toEqual([]);
    });

    it('should handle data with missing hgvsExpression', async () => {
      mockFetchJson({ data: {} });
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toEqual([]);
    });
  });

  describe('hgvsToSpdi', () => {
    it('should build correct URL with encoded HGVS expression', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe(
        'https://api.ncbi.nlm.nih.gov/variation/v0/hgvs/NC_000001.11%3Ag.1014043C%3ET/contextuals',
      );
    });

    it('should include assembly parameter when provided', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T', 'GCF_000001405.40');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('?assembly=GCF_000001405.40');
    });

    it('should not include assembly parameter when omitted', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('assembly');
    });

    it('should map contextual SPDI alleles', async () => {
      mockFetchJson({
        data: {
          spdis: [
            {
              seq_id: 'NC_000001.11',
              position: 1014042,
              deleted_sequence: 'C',
              inserted_sequence: 'T',
            },
          ],
        },
      });
      const clinvar = new ClinVar();

      const result = await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      expect(result).toHaveLength(1);
      expect(result[0]!.sequenceAccession).toBe('NC_000001.11');
      expect(result[0]!.position).toBe(1014042);
      expect(result[0]!.deletedSequence).toBe('C');
      expect(result[0]!.insertedSequence).toBe('T');
    });

    it('should handle missing data', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const result = await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      expect(result).toEqual([]);
    });

    it('should handle data with missing spdis', async () => {
      mockFetchJson({ data: {} });
      const clinvar = new ClinVar();

      const result = await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      expect(result).toEqual([]);
    });

    it('should handle SPDI entry with missing fields', async () => {
      mockFetchJson({ data: { spdis: [{}] } });
      const clinvar = new ClinVar();

      const result = await clinvar.hgvsToSpdi('NC_000001.11:g.1014043C>T');

      expect(result[0]!.sequenceAccession).toBe('');
      expect(result[0]!.position).toBe(0);
      expect(result[0]!.deletedSequence).toBe('');
      expect(result[0]!.insertedSequence).toBe('');
    });
  });

  describe('frequency', () => {
    it('should build correct URL with rsID', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      await clinvar.frequency(328);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/328/frequency');
    });

    it('should map frequency response with populations', async () => {
      mockFetchJson({
        results: [
          {
            study: 'ALFA',
            populations: [
              {
                population: 'European',
                allele_count: 500,
                total_count: 1000,
                frequency: 0.5,
              },
              {
                population: 'African',
                allele_count: 300,
                total_count: 800,
                frequency: 0.375,
              },
            ],
          },
        ],
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.rsid).toBe(328);
      expect(report.populations).toHaveLength(2);
      expect(report.populations[0]!.study).toBe('ALFA');
      expect(report.populations[0]!.population).toBe('European');
      expect(report.populations[0]!.alleleCount).toBe(500);
      expect(report.populations[0]!.totalCount).toBe(1000);
      expect(report.populations[0]!.frequency).toBe(0.5);
      expect(report.populations[1]!.population).toBe('African');
    });

    it('should handle missing results', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.rsid).toBe(328);
      expect(report.populations).toEqual([]);
    });

    it('should handle empty results array', async () => {
      mockFetchJson({ results: [] });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.populations).toEqual([]);
    });

    it('should handle result with missing study and populations', async () => {
      mockFetchJson({ results: [{}] });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.populations).toEqual([]);
    });

    it('should handle population with missing fields', async () => {
      mockFetchJson({ results: [{ study: 'ALFA', populations: [{}] }] });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.populations[0]!.study).toBe('ALFA');
      expect(report.populations[0]!.population).toBe('');
      expect(report.populations[0]!.alleleCount).toBe(0);
      expect(report.populations[0]!.totalCount).toBe(0);
      expect(report.populations[0]!.frequency).toBe(0);
    });

    it('should flatten populations across multiple study results', async () => {
      mockFetchJson({
        results: [
          {
            study: 'ALFA',
            populations: [
              { population: 'European', allele_count: 500, total_count: 1000, frequency: 0.5 },
            ],
          },
          {
            study: 'GnomAD',
            populations: [
              { population: 'Global', allele_count: 700, total_count: 2000, frequency: 0.35 },
            ],
          },
        ],
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.populations).toHaveLength(2);
      expect(report.populations[0]!.study).toBe('ALFA');
      expect(report.populations[1]!.study).toBe('GnomAD');
    });

    it('should default study to empty string when missing from result', async () => {
      mockFetchJson({
        results: [
          {
            populations: [
              { population: 'European', allele_count: 100, total_count: 200, frequency: 0.5 },
            ],
          },
        ],
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.populations[0]!.study).toBe('');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const clinvar = new ClinVar();

      await clinvar.search('TP53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const clinvar = new ClinVar({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await clinvar.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
