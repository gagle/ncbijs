import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { z } from 'zod';

/** Register taxonomy query tools on the MCP server. */
export function registerTaxonomyTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-lookup-taxonomy',
    {
      title: 'Look Up Taxonomy Node',
      description:
        'Look up a taxonomy node by tax ID from the local store. ' +
        'Returns organism name, common name, rank, parent, lineage, and children.',
      inputSchema: {
        taxId: z.string().describe('NCBI Taxonomy ID (e.g., "9606" for Homo sapiens)'),
      },
    },
    async ({ taxId }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('taxonomy', taxId);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `Taxonomy node "${taxId}" not found in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-taxonomy',
    {
      title: 'Search Taxonomy',
      description:
        'Search taxonomy nodes in the local store by organism name, common name, or rank.',
      inputSchema: {
        field: z.string().describe('Field to search (e.g., "organismName", "commonName", "rank")'),
        value: z.string().describe('Value to search for (e.g., "Homo sapiens")'),
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
      const results = await storage.searchRecords<Record<string, unknown>>('taxonomy', {
        field,
        value,
        operator,
        limit,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No taxonomy nodes matching ${field}="${value}" in store`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
