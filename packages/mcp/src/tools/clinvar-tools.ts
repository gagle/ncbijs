import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ClinVar } from '@ncbijs/clinvar';
import { z } from 'zod';

/** Register ClinVar clinical variant search tools on the MCP server. */
export function registerClinVarTools(server: McpServer, getClinVar: () => ClinVar): void {
  server.registerTool(
    'search-clinvar',
    {
      title: 'Search ClinVar',
      description:
        'Search NCBI ClinVar for clinical variants by gene name, variant description, ' +
        'disease name, or other terms. Returns variant UIDs for further lookup.',
      inputSchema: {
        term: z.string().describe('Search term (gene name, variant, disease, etc.)'),
        retmax: z
          .number()
          .optional()
          .default(20)
          .describe('Maximum results to return (default 20)'),
      },
    },
    async ({ term, retmax }) => {
      const clinvar = getClinVar();
      const searchResult = await clinvar.search(term, { ...(retmax !== undefined && { retmax }) });

      if (searchResult.ids.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No ClinVar results found for "${term}"` }],
        };
      }

      const reports = await clinvar.fetch(searchResult.ids);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(reports, null, 2) }],
      };
    },
  );
}
