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
    germline_classification: {
      description: 'Pathogenic/Likely pathogenic',
      last_evaluated: '2026/01/24 00:00',
      review_status: 'criteria provided, conflicting classifications',
      trait_set: [
        {
          trait_name: 'Li-Fraumeni syndrome',
          trait_xrefs: [{ db_source: 'MedGen', db_id: 'C0023357' }],
        },
      ],
    },
    gene_sort: 'TP53',
    genes: [{ geneid: 7157, symbol: 'TP53' }],
    variation_set: [
      {
        variation_loc: [
          {
            assembly_name: 'GRCh38',
            chr: '17',
            start: '7674221',
            stop: '7674221',
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
      expect(reports[0]!.reviewStatus).toBe('');
      expect(reports[0]!.lastEvaluated).toBe('');
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
      mockFetchJson(
        buildSummaryResponse({ '1': { uid: '1', germline_classification: { trait_set: [{}] } } }, [
          '1',
        ]),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.traits[0]!.name).toBe('');
      expect(reports[0]!.traits[0]!.xrefs).toEqual([]);
    });

    it('should handle trait xref with missing fields', async () => {
      mockFetchJson(
        buildSummaryResponse(
          {
            '1': {
              uid: '1',
              germline_classification: { trait_set: [{ trait_xrefs: [{}] }] },
            },
          },
          ['1'],
        ),
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
                {
                  variation_loc: [
                    { assembly_name: 'GRCh38', chr: '17', start: '100', stop: '200' },
                  ],
                },
                {
                  variation_loc: [{ assembly_name: 'GRCh37', chr: '17', start: '50', stop: '150' }],
                },
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

    it('should handle missing germline_classification description', async () => {
      mockFetchJson(
        buildSummaryResponse({ '1': { uid: '1', germline_classification: {} } }, ['1']),
      );
      const clinvar = new ClinVar();

      const reports = await clinvar.fetch(['1']);

      expect(reports[0]!.clinicalSignificance).toBe('');
      expect(reports[0]!.reviewStatus).toBe('');
      expect(reports[0]!.lastEvaluated).toBe('');
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

    it('should return HGVS expression string', async () => {
      mockFetchJson({
        data: {
          hgvs: 'NC_000001.11:g.1014043C>T',
        },
      });
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toBe('NC_000001.11:g.1014043C>T');
    });

    it('should handle missing data', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toBe('');
    });

    it('should handle data with missing hgvs', async () => {
      mockFetchJson({ data: {} });
      const clinvar = new ClinVar();

      const result = await clinvar.spdiToHgvs('NC_000001.11:1014042:C:T');

      expect(result).toBe('');
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

    it('should map frequency response with alleles and populations', async () => {
      mockFetchJson({
        results: {
          '1@5227001': {
            ref: 'T',
            counts: {
              PRJNA507278: {
                allele_counts: {
                  SAMN10492705: { A: 35, C: 0, G: 2, T: 68015 },
                  SAMN10492695: { A: 2, C: 0, G: 0, T: 44826 },
                },
              },
            },
          },
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.rsid).toBe(328);
      expect(report.alleles).toHaveLength(1);
      expect(report.alleles[0]!.alleleId).toBe('1@5227001');
      expect(report.alleles[0]!.referenceAllele).toBe('T');
      expect(report.alleles[0]!.populations).toHaveLength(2);
      expect(report.alleles[0]!.populations[0]!.study).toBe('PRJNA507278');
      expect(report.alleles[0]!.populations[0]!.biosample).toBe('SAMN10492705');
      expect(report.alleles[0]!.populations[0]!.alleleCounts).toEqual({
        A: 35,
        C: 0,
        G: 2,
        T: 68015,
      });
      expect(report.alleles[0]!.populations[0]!.totalCount).toBe(68052);
    });

    it('should handle missing results', async () => {
      mockFetchJson({});
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.rsid).toBe(328);
      expect(report.alleles).toEqual([]);
    });

    it('should handle empty results object', async () => {
      mockFetchJson({ results: {} });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.alleles).toEqual([]);
    });

    it('should handle allele with missing counts', async () => {
      mockFetchJson({
        results: {
          '1@100': { ref: 'A' },
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.alleles).toHaveLength(1);
      expect(report.alleles[0]!.referenceAllele).toBe('A');
      expect(report.alleles[0]!.populations).toEqual([]);
    });

    it('should handle allele with missing ref', async () => {
      mockFetchJson({
        results: {
          '1@100': {},
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.alleles[0]!.referenceAllele).toBe('');
    });

    it('should handle multiple alleles across multiple studies', async () => {
      mockFetchJson({
        results: {
          '1@100': {
            ref: 'A',
            counts: {
              PRJNA1: {
                allele_counts: {
                  SAMN1: { A: 100, T: 50 },
                },
              },
            },
          },
          '2@100': {
            ref: 'G',
            counts: {
              PRJNA2: {
                allele_counts: {
                  SAMN2: { G: 80, C: 20 },
                },
              },
            },
          },
        },
      });
      const clinvar = new ClinVar();

      const report = await clinvar.frequency(328);

      expect(report.alleles).toHaveLength(2);
      const alleleIds = report.alleles.map((a) => a.alleleId);
      expect(alleleIds).toContain('1@100');
      expect(alleleIds).toContain('2@100');
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
