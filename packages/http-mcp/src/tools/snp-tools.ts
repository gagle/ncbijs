import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Snp } from '@ncbijs/snp';
import { z } from 'zod';

/** Register dbSNP variant lookup tools on the MCP server. */
export function registerSnpTools(server: McpServer, getSnp: () => Snp): void {
  server.registerTool(
    'lookup-variant',
    {
      title: 'Look Up SNP Variant',
      description:
        'Retrieve SNP variant data from NCBI dbSNP (Variation Services API). Returns alleles, ' +
        'chromosomal placements, allele frequencies across populations, and clinical significance.',
      inputSchema: {
        rsIds: z
          .array(z.number())
          .min(1)
          .max(10)
          .describe('RS IDs (numeric, without "rs" prefix, e.g., [7412, 429358])'),
      },
    },
    async ({ rsIds }) => {
      const snp = getSnp();
      const reports = await snp.refsnpBatch(rsIds);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
      };
    },
  );
}
