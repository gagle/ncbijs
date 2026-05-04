import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { z } from 'zod';

/** Register MeSH descriptor query tools on the MCP server. */
export function registerMeshTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-lookup-mesh',
    {
      title: 'Look Up MeSH Descriptor',
      description:
        'Look up a MeSH descriptor by its unique ID (e.g., D000001) from the local store. ' +
        'Returns the descriptor name, tree numbers, qualifiers, and pharmacological actions.',
      inputSchema: {
        id: z.string().describe('MeSH descriptor UI (e.g., "D000001")'),
      },
    },
    async ({ id }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('mesh', id);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `MeSH descriptor "${id}" not found in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-mesh',
    {
      title: 'Search MeSH Descriptors',
      description:
        'Search MeSH descriptors by name in the local store. Supports exact match, ' +
        'prefix match (starts_with), and substring match (contains).',
      inputSchema: {
        name: z.string().describe('Descriptor name to search for (e.g., "Aspirin")'),
        operator: z
          .enum(['eq', 'starts_with', 'contains'])
          .optional()
          .default('starts_with')
          .describe('Match operator (default: starts_with)'),
        limit: z.number().optional().default(20).describe('Maximum results (default: 20)'),
      },
    },
    async ({ name, operator, limit }) => {
      const storage = getStorage();
      const results = await storage.searchRecords<Record<string, unknown>>('mesh', {
        field: 'name',
        value: name,
        operator,
        limit,
      });

      if (results.length === 0) {
        return {
          content: [
            { type: 'text' as const, text: `No MeSH descriptors matching "${name}" in store` },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );
}
