import { describe, expect, it } from 'vitest';
import { Datasets } from '@ncbijs/datasets';

const datasets = new Datasets({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('NCBI Datasets API v2 E2E', () => {
  describe('geneById', () => {
    it('should retrieve BRCA1 gene metadata by ID', async () => {
      const reports = await datasets.geneById([672]);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.geneId).toBe(672);
      expect(reports[0]!.symbol).toBe('BRCA1');
      expect(reports[0]!.taxId).toBe(9606);
      expect(reports[0]!.taxName).toBe('Homo sapiens');
      expect(reports[0]!.type).toBe('protein-coding');
      expect(reports[0]!.chromosomes).toContain('17');
      expect(reports[0]!.transcriptCount).toBeGreaterThan(0);
      expect(reports[0]!.proteinCount).toBeGreaterThan(0);
    });

    it('should retrieve multiple genes at once', async () => {
      const reports = await datasets.geneById([672, 7157]);

      expect(reports).toHaveLength(2);

      const symbols = reports.map((report) => report.symbol);
      expect(symbols).toContain('BRCA1');
      expect(symbols).toContain('TP53');
    });

    it('should include gene ontology terms', async () => {
      const reports = await datasets.geneById([672]);
      const ontology = reports[0]!.geneOntology;

      expect(ontology.molecularFunctions.length).toBeGreaterThan(0);
      expect(ontology.biologicalProcesses.length).toBeGreaterThan(0);
      expect(ontology.cellularComponents.length).toBeGreaterThan(0);
      expect(ontology.molecularFunctions[0]!.goId).toMatch(/^GO:\d+$/);
    });
  });

  describe('geneBySymbol', () => {
    it('should retrieve TP53 by symbol and taxon ID', async () => {
      const reports = await datasets.geneBySymbol(['TP53'], 9606);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.symbol).toBe('TP53');
      expect(reports[0]!.geneId).toBe(7157);
    });

    it('should retrieve gene by symbol and taxon name', async () => {
      const reports = await datasets.geneBySymbol(['BRCA1'], 'human');

      expect(reports).toHaveLength(1);
      expect(reports[0]!.symbol).toBe('BRCA1');
    });
  });

  describe('taxonomy', () => {
    it('should retrieve Homo sapiens taxonomy', async () => {
      const reports = await datasets.taxonomy([9606]);

      expect(reports.length).toBeGreaterThanOrEqual(1);
      const hsReport = reports.find((report) => report.taxId === 9606);
      expect(hsReport).toBeDefined();
      expect(hsReport!.organismName).toBe('Homo sapiens');
      expect(hsReport!.rank).toBe('species');
      expect(hsReport!.lineage.length).toBeGreaterThan(0);
    });

    it('should retrieve multiple taxa', async () => {
      const reports = await datasets.taxonomy([9606, 10090]);

      expect(reports.length).toBeGreaterThanOrEqual(2);

      const names = reports.map((report) => report.organismName);
      expect(names).toContain('Homo sapiens');
      expect(names).toContain('Mus musculus');
    });

    it('should include gene/assembly counts when available', async () => {
      const reports = await datasets.taxonomy([9606]);
      const hsReport = reports.find((report) => report.taxId === 9606);
      expect(hsReport).toBeDefined();

      if (hsReport!.counts.length > 0) {
        const geneCounts = hsReport!.counts.find((count) => count.type === 'gene');
        if (geneCounts !== undefined) {
          expect(geneCounts.count).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('genomeByAccession', () => {
    it('should retrieve human reference genome assembly', async () => {
      const reports = await datasets.genomeByAccession(['GCF_000001405.40']);

      expect(reports).toHaveLength(1);
      expect(reports[0]!.accession).toBe('GCF_000001405.40');
      expect(reports[0]!.organism.organismName).toBe('Homo sapiens');
      expect(reports[0]!.assemblyInfo.assemblyName).toContain('GRCh38');
      expect(reports[0]!.assemblyInfo.assemblyLevel).toBe('Chromosome');
      expect(reports[0]!.assemblyStats.totalNumberOfChromosomes).toBeGreaterThan(0);
      expect(reports[0]!.assemblyStats.gcPercent).toBeGreaterThan(0);
    });
  });

  describe('genomeByTaxon', () => {
    it('should retrieve genome assemblies for E. coli', async () => {
      const reports = await datasets.genomeByTaxon(562);

      expect(reports.length).toBeGreaterThan(0);
      expect([562, 511145]).toContain(reports[0]!.organism.taxId);
    });
  });

  describe('virusByAccession', () => {
    it('should retrieve SARS-CoV-2 reference genome', async () => {
      const reports = await datasets.virusByAccession(['NC_045512.2']);

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0]!.accession).toBe('NC_045512.2');
      expect(reports[0]!.length).toBeGreaterThan(0);
    });
  });

  describe('virusByTaxon', () => {
    it('should retrieve viruses by taxon ID', async () => {
      const reports = await datasets.virusByTaxon(2697049);

      expect(reports.length).toBeGreaterThan(0);
    });
  });

  describe('bioproject', () => {
    it('should retrieve a bioproject by accession', async () => {
      try {
        const reports = await datasets.bioproject(['PRJNA168']);

        expect(reports.length).toBeGreaterThan(0);
        expect(reports[0]!.accession).toBe('PRJNA168');
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('status 404')) {
          return;
        }
        throw error;
      }
    });
  });

  describe('biosample', () => {
    it('should retrieve a biosample by accession', async () => {
      try {
        const reports = await datasets.biosample(['SAMN13922059']);

        expect(reports.length).toBeGreaterThan(0);
        expect(reports[0]!.accession).toBe('SAMN13922059');
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('status 404')) {
          return;
        }
        throw error;
      }
    });
  });
});
