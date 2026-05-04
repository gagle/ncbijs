import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Datasets } from '@ncbijs/datasets';
import { z } from 'zod';

/** Register NCBI Datasets gene, taxonomy, and genome tools on the MCP server. */
export function registerDatasetsTools(server: McpServer, getDatasets: () => Datasets): void {
  server.registerTool(
    'search-gene',
    {
      title: 'Search Gene',
      description:
        'Retrieve gene metadata from NCBI Datasets API v2. Search by gene IDs (numeric) or by ' +
        'gene symbols with a taxon filter. Returns gene description, chromosomal location, ' +
        'ontology terms, transcript/protein counts, and cross-references.',
      inputSchema: {
        geneIds: z.array(z.number()).optional().describe('NCBI Gene IDs (e.g., [672, 7157])'),
        symbols: z
          .array(z.string())
          .optional()
          .describe('Gene symbols (e.g., ["BRCA1", "TP53"]). Requires taxon.'),
        taxon: z
          .union([z.number(), z.string()])
          .optional()
          .describe('Taxon ID or name (e.g., 9606 or "human"). Required when using symbols.'),
      },
    },
    async ({ geneIds, symbols, taxon }) => {
      const datasets = getDatasets();

      if (geneIds !== undefined && geneIds.length > 0) {
        const reports = await datasets.geneById(geneIds);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
        };
      }

      if (symbols !== undefined && symbols.length > 0) {
        if (taxon === undefined) {
          return {
            content: [
              { type: 'text' as const, text: 'Error: taxon is required when searching by symbol' },
            ],
            isError: true,
          };
        }
        const reports = await datasets.geneBySymbol(symbols, taxon);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
        };
      }

      return {
        content: [
          { type: 'text' as const, text: 'Error: provide either geneIds or symbols + taxon' },
        ],
        isError: true,
      };
    },
  );

  server.registerTool(
    'lookup-taxonomy',
    {
      title: 'Look Up Taxonomy',
      description:
        'Retrieve taxonomy data from NCBI Datasets API v2. Returns organism name, rank, ' +
        'lineage, children taxa, and counts of genes/assemblies per taxon.',
      inputSchema: {
        taxons: z
          .array(z.union([z.number(), z.string()]))
          .min(1)
          .describe('Taxon IDs or names (e.g., [9606] or ["human", "mouse"])'),
      },
    },
    async ({ taxons }) => {
      const datasets = getDatasets();
      const reports = await datasets.taxonomy(taxons);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
      };
    },
  );

  server.registerTool(
    'search-genome',
    {
      title: 'Search Genome Assembly',
      description:
        'Retrieve genome assembly reports from NCBI Datasets API v2. Search by assembly ' +
        'accessions (e.g., GCF_000001405.40) or by taxon. Returns assembly metadata, ' +
        'statistics (N50, scaffold count, GC%), and annotation info.',
      inputSchema: {
        accessions: z
          .array(z.string())
          .optional()
          .describe('Assembly accessions (e.g., ["GCF_000001405.40"])'),
        taxon: z
          .union([z.number(), z.string()])
          .optional()
          .describe('Taxon ID or name (e.g., 9606 or "human")'),
      },
    },
    async ({ accessions, taxon }) => {
      const datasets = getDatasets();

      if (accessions !== undefined && accessions.length > 0) {
        const reports = await datasets.genomeByAccession(accessions);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
        };
      }

      if (taxon !== undefined) {
        const reports = await datasets.genomeByTaxon(taxon);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: 'Error: provide either accessions or taxon' }],
        isError: true,
      };
    },
  );
}
