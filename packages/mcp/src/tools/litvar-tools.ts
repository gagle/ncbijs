import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';

/** Register LitVar variant-literature linking tools on the MCP server. */
export function registerLitVarTools(server: McpServer): void {
  server.registerTool(
    'search-litvar',
    {
      title: 'Search LitVar',
      description:
        'Search LitVar2 for genetic variants matching a query and find associated literature. ' +
        'Returns variant rsIDs, HGVS notations, genes, and publication counts.',
      inputSchema: {
        rsid: z.string().describe('dbSNP rsID (e.g., "rs328")'),
      },
    },
    async ({ rsid }) => {
      const { variant, publications } = await import('@ncbijs/litvar');
      const [variantInfo, pubs] = await Promise.all([variant(rsid), publications(rsid)]);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ variant: variantInfo, publications: pubs }, null, 2),
          },
        ],
      };
    },
  );
}
