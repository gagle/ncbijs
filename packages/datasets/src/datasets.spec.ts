import { afterEach, describe, expect, it, vi } from 'vitest';
import { Datasets } from './datasets';

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

function buildGeneResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reports: [
      {
        gene: {
          gene_id: 672,
          symbol: 'BRCA1',
          description: 'BRCA1 DNA repair associated',
          tax_id: 9606,
          taxname: 'Homo sapiens',
          common_name: 'human',
          type: 'protein-coding',
          chromosomes: ['17'],
          synonyms: ['IRIS', 'PSCP', 'BRCAI'],
          swiss_prot_accessions: ['P38398'],
          ensembl_gene_ids: ['ENSG00000012048'],
          omim_ids: ['113705'],
          summary: ['This gene encodes a nuclear phosphoprotein.'],
          transcript_count: 27,
          protein_count: 13,
          gene_ontology: {
            molecular_functions: [{ name: 'DNA binding', go_id: 'GO:0003677' }],
            biological_processes: [{ name: 'DNA repair', go_id: 'GO:0006281' }],
            cellular_components: [{ name: 'nucleus', go_id: 'GO:0005634' }],
          },
          ...overrides,
        },
      },
    ],
  };
}

function buildTaxonomyResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    taxonomy_nodes: [
      {
        taxonomy: {
          tax_id: 9606,
          organism_name: 'Homo sapiens',
          genbank_common_name: 'human',
          rank: 'species',
          lineage: [1, 131567, 2759, 33154, 7742, 9606],
          children: [],
          counts: [
            { type: 'gene', count: 193862 },
            { type: 'assembly', count: 2497 },
          ],
          ...overrides,
        },
      },
    ],
  };
}

function buildGenomeResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    reports: [
      {
        accession: 'GCF_000001405.40',
        current_accession: 'GCF_000001405.40',
        source_database: 'RefSeq',
        organism: {
          tax_id: 9606,
          organism_name: 'Homo sapiens',
          common_name: 'human',
        },
        assembly_info: {
          assembly_level: 'Chromosome',
          assembly_status: 'current',
          assembly_name: 'GRCh38.p14',
          assembly_type: 'haploid-with-alt-loci',
          bioproject_accession: 'PRJNA168',
          release_date: '2022-02-03',
          submitter: 'Genome Reference Consortium',
          refseq_category: 'reference genome',
          description: 'Genome Reference Consortium Human Build 38 patch release 14',
        },
        assembly_stats: {
          total_number_of_chromosomes: 24,
          total_sequence_length: '3298912062',
          total_ungapped_length: '3096649726',
          number_of_contigs: 980,
          contig_n50: 57879411,
          contig_l50: 18,
          number_of_scaffolds: 705,
          scaffold_n50: 67794873,
          scaffold_l50: 16,
          gc_percent: 41,
        },
        ...overrides,
      },
    ],
  };
}

describe('Datasets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('geneById', () => {
    it('should fetch gene by ID and map fields', async () => {
      mockFetchJson(buildGeneResponse());
      const datasets = new Datasets();

      const reports = await datasets.geneById([672]);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.geneId).toBe(672);
      expect(reports[0]!.symbol).toBe('BRCA1');
      expect(reports[0]!.description).toBe('BRCA1 DNA repair associated');
      expect(reports[0]!.taxId).toBe(9606);
      expect(reports[0]!.taxName).toBe('Homo sapiens');
      expect(reports[0]!.commonName).toBe('human');
      expect(reports[0]!.type).toBe('protein-coding');
      expect(reports[0]!.chromosomes).toEqual(['17']);
      expect(reports[0]!.synonyms).toEqual(['IRIS', 'PSCP', 'BRCAI']);
      expect(reports[0]!.swissProtAccessions).toEqual(['P38398']);
      expect(reports[0]!.transcriptCount).toBe(27);
      expect(reports[0]!.proteinCount).toBe(13);
    });

    it('should map gene ontology terms', async () => {
      mockFetchJson(buildGeneResponse());
      const datasets = new Datasets();

      const reports = await datasets.geneById([672]);
      const ontology = reports[0]!.geneOntology;

      expect(ontology.molecularFunctions).toHaveLength(1);
      expect(ontology.molecularFunctions[0]!.name).toBe('DNA binding');
      expect(ontology.molecularFunctions[0]!.goId).toBe('GO:0003677');
      expect(ontology.biologicalProcesses[0]!.name).toBe('DNA repair');
      expect(ontology.cellularComponents[0]!.name).toBe('nucleus');
    });

    it('should join summary array into a single string', async () => {
      mockFetchJson(buildGeneResponse());
      const datasets = new Datasets();

      const reports = await datasets.geneById([672]);
      expect(reports[0]!.summary).toBe('This gene encodes a nuclear phosphoprotein.');
    });

    it('should build correct URL for multiple gene IDs', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.geneById([672, 7157]);

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const url = fetchCall[0] as string;
      expect(url).toContain('/gene/id/672%2C7157');
    });

    it('should throw on empty gene IDs array', async () => {
      const datasets = new Datasets();
      await expect(datasets.geneById([])).rejects.toThrow('geneIds must not be empty');
    });

    it('should handle missing optional fields gracefully', async () => {
      mockFetchJson({ reports: [{ gene: { gene_id: 1 } }] });
      const datasets = new Datasets();

      const reports = await datasets.geneById([1]);
      expect(reports[0]!.symbol).toBe('');
      expect(reports[0]!.chromosomes).toEqual([]);
      expect(reports[0]!.geneOntology.molecularFunctions).toEqual([]);
    });

    it('should handle empty reports array', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      const reports = await datasets.geneById([999999999]);
      expect(reports).toEqual([]);
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.geneById([1]);
      expect(reports).toEqual([]);
    });

    it('should handle report with missing gene wrapper', async () => {
      mockFetchJson({ reports: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.geneById([1]);
      expect(reports[0]!.geneId).toBe(0);
      expect(reports[0]!.symbol).toBe('');
      expect(reports[0]!.summary).toBe('');
      expect(reports[0]!.transcriptCount).toBe(0);
      expect(reports[0]!.geneOntology.molecularFunctions).toEqual([]);
    });

    it('should handle go terms with missing fields', async () => {
      mockFetchJson({
        reports: [
          {
            gene: {
              gene_id: 1,
              gene_ontology: {
                molecular_functions: [{}],
                biological_processes: [{}],
                cellular_components: [{}],
              },
            },
          },
        ],
      });
      const datasets = new Datasets();

      const reports = await datasets.geneById([1]);
      expect(reports[0]!.geneOntology.molecularFunctions[0]!.name).toBe('');
      expect(reports[0]!.geneOntology.molecularFunctions[0]!.goId).toBe('');
      expect(reports[0]!.geneOntology.biologicalProcesses[0]!.name).toBe('');
      expect(reports[0]!.geneOntology.cellularComponents[0]!.name).toBe('');
    });
  });

  describe('geneBySymbol', () => {
    it('should fetch gene by symbol and taxon', async () => {
      mockFetchJson(buildGeneResponse());
      const datasets = new Datasets();

      const reports = await datasets.geneBySymbol(['BRCA1'], 9606);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.symbol).toBe('BRCA1');
    });

    it('should build correct URL with taxon name', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.geneBySymbol(['TP53'], 'human');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/gene/symbol/TP53/taxon/human');
    });

    it('should throw on empty symbols array', async () => {
      const datasets = new Datasets();
      await expect(datasets.geneBySymbol([], 9606)).rejects.toThrow('symbols must not be empty');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.geneBySymbol(['UNKNOWN'], 9606);
      expect(reports).toEqual([]);
    });
  });

  describe('taxonomy', () => {
    it('should fetch taxonomy by taxon ID and map fields', async () => {
      mockFetchJson(buildTaxonomyResponse());
      const datasets = new Datasets();

      const reports = await datasets.taxonomy([9606]);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.taxId).toBe(9606);
      expect(reports[0]!.organismName).toBe('Homo sapiens');
      expect(reports[0]!.commonName).toBe('human');
      expect(reports[0]!.rank).toBe('species');
      expect(reports[0]!.lineage).toContain(9606);
      expect(reports[0]!.counts).toHaveLength(2);
      expect(reports[0]!.counts[0]!.type).toBe('gene');
      expect(reports[0]!.counts[0]!.count).toBe(193862);
    });

    it('should throw on empty taxons array', async () => {
      const datasets = new Datasets();
      await expect(datasets.taxonomy([])).rejects.toThrow('taxons must not be empty');
    });

    it('should handle missing taxonomy_nodes key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.taxonomy([1]);
      expect(reports).toEqual([]);
    });

    it('should handle minimal taxonomy response with missing fields', async () => {
      mockFetchJson({ taxonomy_nodes: [{ taxonomy: {} }] });
      const datasets = new Datasets();

      const reports = await datasets.taxonomy([1]);
      expect(reports[0]!.taxId).toBe(0);
      expect(reports[0]!.organismName).toBe('');
      expect(reports[0]!.commonName).toBe('');
      expect(reports[0]!.rank).toBe('');
      expect(reports[0]!.lineage).toEqual([]);
      expect(reports[0]!.children).toEqual([]);
      expect(reports[0]!.counts).toEqual([]);
    });

    it('should handle taxonomy node with missing taxonomy wrapper', async () => {
      mockFetchJson({ taxonomy_nodes: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.taxonomy([1]);
      expect(reports[0]!.taxId).toBe(0);
      expect(reports[0]!.organismName).toBe('');
    });

    it('should handle taxonomy counts with missing fields', async () => {
      mockFetchJson({
        taxonomy_nodes: [{ taxonomy: { tax_id: 1, counts: [{}] } }],
      });
      const datasets = new Datasets();

      const reports = await datasets.taxonomy([1]);
      expect(reports[0]!.counts[0]!.type).toBe('');
      expect(reports[0]!.counts[0]!.count).toBe(0);
    });
  });

  describe('genomeByAccession', () => {
    it('should fetch genome by accession and map fields', async () => {
      mockFetchJson(buildGenomeResponse());
      const datasets = new Datasets();

      const reports = await datasets.genomeByAccession(['GCF_000001405.40']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.accession).toBe('GCF_000001405.40');
      expect(reports[0]!.sourceDatabase).toBe('RefSeq');
      expect(reports[0]!.organism.organismName).toBe('Homo sapiens');
      expect(reports[0]!.assemblyInfo.assemblyName).toBe('GRCh38.p14');
      expect(reports[0]!.assemblyInfo.assemblyLevel).toBe('Chromosome');
      expect(reports[0]!.assemblyStats.totalNumberOfChromosomes).toBe(24);
      expect(reports[0]!.assemblyStats.gcPercent).toBe(41);
    });

    it('should throw on empty accessions array', async () => {
      const datasets = new Datasets();
      await expect(datasets.genomeByAccession([])).rejects.toThrow('accessions must not be empty');
    });

    it('should handle minimal genome response with missing fields', async () => {
      mockFetchJson({ reports: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.genomeByAccession(['GCF_000001405.40']);

      expect(reports[0]!.accession).toBe('');
      expect(reports[0]!.currentAccession).toBe('');
      expect(reports[0]!.sourceDatabase).toBe('');
      expect(reports[0]!.organism.taxId).toBe(0);
      expect(reports[0]!.organism.organismName).toBe('');
      expect(reports[0]!.organism.commonName).toBe('');
      expect(reports[0]!.assemblyInfo.assemblyLevel).toBe('');
      expect(reports[0]!.assemblyInfo.assemblyStatus).toBe('');
      expect(reports[0]!.assemblyInfo.assemblyName).toBe('');
      expect(reports[0]!.assemblyInfo.assemblyType).toBe('');
      expect(reports[0]!.assemblyInfo.bioprojectAccession).toBe('');
      expect(reports[0]!.assemblyInfo.releaseDate).toBe('');
      expect(reports[0]!.assemblyInfo.submitter).toBe('');
      expect(reports[0]!.assemblyInfo.refseqCategory).toBe('');
      expect(reports[0]!.assemblyInfo.description).toBe('');
      expect(reports[0]!.assemblyStats.totalNumberOfChromosomes).toBe(0);
      expect(reports[0]!.assemblyStats.totalSequenceLength).toBe('');
      expect(reports[0]!.assemblyStats.totalUngappedLength).toBe('');
      expect(reports[0]!.assemblyStats.numberOfContigs).toBe(0);
      expect(reports[0]!.assemblyStats.contigN50).toBe(0);
      expect(reports[0]!.assemblyStats.contigL50).toBe(0);
      expect(reports[0]!.assemblyStats.numberOfScaffolds).toBe(0);
      expect(reports[0]!.assemblyStats.scaffoldN50).toBe(0);
      expect(reports[0]!.assemblyStats.scaffoldL50).toBe(0);
      expect(reports[0]!.assemblyStats.gcPercent).toBe(0);
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.genomeByAccession(['GCF_000001405.40']);
      expect(reports).toEqual([]);
    });
  });

  describe('genomeByTaxon', () => {
    it('should fetch genome by taxon and map fields', async () => {
      mockFetchJson(buildGenomeResponse());
      const datasets = new Datasets();

      const reports = await datasets.genomeByTaxon(9606);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.organism.taxId).toBe(9606);
    });

    it('should build correct URL with taxon name', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.genomeByTaxon('human');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/genome/taxon/human/dataset_report');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.genomeByTaxon(999999999);
      expect(reports).toEqual([]);
    });
  });

  describe('virusByAccession', () => {
    it('should fetch virus by accession and map fields', async () => {
      mockFetchJson({
        reports: [
          {
            accession: 'NC_045512.2',
            tax_id: 2697049,
            organism_name: 'Severe acute respiratory syndrome coronavirus 2',
            isolate_name: 'Wuhan-Hu-1',
            host: 'Homo sapiens',
            collection_date: '2019-12',
            geo_location: 'China',
            completeness: 'complete',
            length: 29903,
            bioproject_accession: 'PRJNA485481',
            biosample_accession: 'SAMN13922059',
          },
        ],
      });
      const datasets = new Datasets();

      const reports = await datasets.virusByAccession(['NC_045512.2']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.accession).toBe('NC_045512.2');
      expect(reports[0]!.taxId).toBe(2697049);
      expect(reports[0]!.organismName).toBe('Severe acute respiratory syndrome coronavirus 2');
      expect(reports[0]!.isolateName).toBe('Wuhan-Hu-1');
      expect(reports[0]!.host).toBe('Homo sapiens');
      expect(reports[0]!.collectionDate).toBe('2019-12');
      expect(reports[0]!.geoLocation).toBe('China');
      expect(reports[0]!.completeness).toBe('complete');
      expect(reports[0]!.length).toBe(29903);
      expect(reports[0]!.bioprojectAccession).toBe('PRJNA485481');
      expect(reports[0]!.biosampleAccession).toBe('SAMN13922059');
    });

    it('should build correct URL with encoded accession', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.virusByAccession(['NC_045512.2']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/virus/accession/NC_045512.2/dataset_report');
    });

    it('should throw on empty accessions array', async () => {
      const datasets = new Datasets();
      await expect(datasets.virusByAccession([])).rejects.toThrow('accessions must not be empty');
    });

    it('should handle missing optional fields gracefully', async () => {
      mockFetchJson({ reports: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.virusByAccession(['NC_045512.2']);

      expect(reports[0]!.accession).toBe('');
      expect(reports[0]!.taxId).toBe(0);
      expect(reports[0]!.organismName).toBe('');
      expect(reports[0]!.isolateName).toBe('');
      expect(reports[0]!.host).toBe('');
      expect(reports[0]!.collectionDate).toBe('');
      expect(reports[0]!.geoLocation).toBe('');
      expect(reports[0]!.completeness).toBe('');
      expect(reports[0]!.length).toBe(0);
      expect(reports[0]!.bioprojectAccession).toBe('');
      expect(reports[0]!.biosampleAccession).toBe('');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.virusByAccession(['NC_045512.2']);
      expect(reports).toEqual([]);
    });
  });

  describe('virusByTaxon', () => {
    it('should fetch viruses by taxon and map fields', async () => {
      mockFetchJson({
        reports: [
          {
            accession: 'NC_045512.2',
            tax_id: 2697049,
            organism_name: 'SARS-CoV-2',
            completeness: 'complete',
            length: 29903,
          },
        ],
      });
      const datasets = new Datasets();

      const reports = await datasets.virusByTaxon(2697049);
      expect(reports).toHaveLength(1);
      expect(reports[0]!.taxId).toBe(2697049);
    });

    it('should build correct URL with taxon name', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.virusByTaxon('SARS-CoV-2');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/virus/taxon/SARS-CoV-2/dataset_report');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.virusByTaxon(999999999);
      expect(reports).toEqual([]);
    });
  });

  describe('bioproject', () => {
    it('should fetch bioproject by accession and map fields', async () => {
      mockFetchJson({
        reports: [
          {
            accession: 'PRJNA168',
            title: 'Homo sapiens genome sequencing',
            description: 'The human genome project.',
            organism_name: 'Homo sapiens',
            tax_id: 9606,
            project_type: 'primary_submission',
            registration_date: '2001-01-01',
          },
        ],
      });
      const datasets = new Datasets();

      const reports = await datasets.bioproject(['PRJNA168']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.accession).toBe('PRJNA168');
      expect(reports[0]!.title).toBe('Homo sapiens genome sequencing');
      expect(reports[0]!.description).toBe('The human genome project.');
      expect(reports[0]!.organismName).toBe('Homo sapiens');
      expect(reports[0]!.taxId).toBe(9606);
      expect(reports[0]!.projectType).toBe('primary_submission');
      expect(reports[0]!.registrationDate).toBe('2001-01-01');
    });

    it('should build correct URL with accession', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.bioproject(['PRJNA168']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/bioproject/accession/PRJNA168');
    });

    it('should throw on empty accessions array', async () => {
      const datasets = new Datasets();
      await expect(datasets.bioproject([])).rejects.toThrow('accessions must not be empty');
    });

    it('should handle missing optional fields gracefully', async () => {
      mockFetchJson({ reports: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.bioproject(['PRJNA168']);

      expect(reports[0]!.accession).toBe('');
      expect(reports[0]!.title).toBe('');
      expect(reports[0]!.description).toBe('');
      expect(reports[0]!.organismName).toBe('');
      expect(reports[0]!.taxId).toBe(0);
      expect(reports[0]!.projectType).toBe('');
      expect(reports[0]!.registrationDate).toBe('');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.bioproject(['PRJNA168']);
      expect(reports).toEqual([]);
    });
  });

  describe('biosample', () => {
    it('should fetch biosample by accession and map fields', async () => {
      mockFetchJson({
        reports: [
          {
            accession: 'SAMN13922059',
            title: 'SARS-CoV-2 sample',
            description: 'Virus isolate.',
            organism_name: 'SARS-CoV-2',
            tax_id: 2697049,
            owner_name: 'Wuhan Institute of Virology',
            submission_date: '2020-01-05',
            publication_date: '2020-01-10',
            attributes: [
              { name: 'collection_date', value: '2019-12' },
              { name: 'geo_loc_name', value: 'China' },
            ],
          },
        ],
      });
      const datasets = new Datasets();

      const reports = await datasets.biosample(['SAMN13922059']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.accession).toBe('SAMN13922059');
      expect(reports[0]!.title).toBe('SARS-CoV-2 sample');
      expect(reports[0]!.description).toBe('Virus isolate.');
      expect(reports[0]!.organismName).toBe('SARS-CoV-2');
      expect(reports[0]!.taxId).toBe(2697049);
      expect(reports[0]!.ownerName).toBe('Wuhan Institute of Virology');
      expect(reports[0]!.submissionDate).toBe('2020-01-05');
      expect(reports[0]!.publicationDate).toBe('2020-01-10');
      expect(reports[0]!.attributes).toHaveLength(2);
      expect(reports[0]!.attributes[0]!.name).toBe('collection_date');
      expect(reports[0]!.attributes[0]!.value).toBe('2019-12');
    });

    it('should build correct URL with accession', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.biosample(['SAMN13922059']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('/biosample/accession/SAMN13922059');
    });

    it('should throw on empty accessions array', async () => {
      const datasets = new Datasets();
      await expect(datasets.biosample([])).rejects.toThrow('accessions must not be empty');
    });

    it('should handle missing optional fields gracefully', async () => {
      mockFetchJson({ reports: [{}] });
      const datasets = new Datasets();

      const reports = await datasets.biosample(['SAMN13922059']);

      expect(reports[0]!.accession).toBe('');
      expect(reports[0]!.title).toBe('');
      expect(reports[0]!.description).toBe('');
      expect(reports[0]!.organismName).toBe('');
      expect(reports[0]!.taxId).toBe(0);
      expect(reports[0]!.ownerName).toBe('');
      expect(reports[0]!.submissionDate).toBe('');
      expect(reports[0]!.publicationDate).toBe('');
      expect(reports[0]!.attributes).toEqual([]);
    });

    it('should handle attributes with missing fields', async () => {
      mockFetchJson({
        reports: [{ accession: 'SAMN1', attributes: [{}] }],
      });
      const datasets = new Datasets();

      const reports = await datasets.biosample(['SAMN1']);

      expect(reports[0]!.attributes[0]!.name).toBe('');
      expect(reports[0]!.attributes[0]!.value).toBe('');
    });

    it('should handle missing reports key', async () => {
      mockFetchJson({});
      const datasets = new Datasets();

      const reports = await datasets.biosample(['SAMN13922059']);
      expect(reports).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should accept API key in config', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets({ apiKey: 'my-key' });

      await datasets.geneById([1]);

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers['api-key']).toBe('my-key');
    });

    it('should work without any config', async () => {
      mockFetchJson({ reports: [] });
      const datasets = new Datasets();

      await datasets.geneById([1]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
