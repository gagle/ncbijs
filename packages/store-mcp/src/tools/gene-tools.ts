import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { z } from 'zod';

/** Register gene query tools on the MCP server. */
export function registerGeneTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-lookup-gene',
    {
      title: 'Look Up Gene',
      description:
        'Look up a gene by NCBI Gene ID from the local store. ' +
        'Returns symbol, description, tax ID, type, chromosomes, synonyms, and cross-references.',
      inputSchema: {
        geneId: z.string().describe('NCBI Gene ID (e.g., "672" for BRCA1)'),
      },
    },
    async ({ geneId }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('genes', geneId);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `Gene "${geneId}" not found in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-genes',
    {
      title: 'Search Genes',
      description: 'Search genes in the local store by symbol, description, type, or tax ID.',
      inputSchema: {
        field: z.string().describe('Field to search (e.g., "symbol", "description", "taxId")'),
        value: z.string().describe('Value to search for (e.g., "BRCA1", "9606")'),
        operator: z
          .enum(['eq', 'starts_with', 'contains'])
          .optional()
          .default('eq')
          .describe('Match operator (default: eq)'),
        limit: z.number().optional().default(20).describe('Maximum results (default: 20)'),
      },
    },
    async ({ field, value, operator, limit }) => {
      const storage = getStorage();
      const results = await storage.searchRecords<Record<string, unknown>>('genes', {
        field,
        value,
        operator,
        limit,
      });

      if (results.length === 0) {
        return {
          content: [
            { type: 'text' as const, text: `No genes matching ${field}="${value}" in store` },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
