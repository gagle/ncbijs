import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { z } from 'zod';

/** Register ID mapping query tools on the MCP server. */
export function registerIdMappingTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-convert-ids',
    {
      title: 'Convert Article IDs',
      description:
        'Convert between PMID, PMCID, DOI, and Manuscript ID using the local store. ' +
        'Provide any one ID to look up the corresponding mappings.',
      inputSchema: {
        id: z.string().describe('Article ID to look up (PMID, PMCID, DOI, or Manuscript ID)'),
      },
    },
    async ({ id }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('id-mappings', id);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `No ID mapping found for "${id}" in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-ids',
    {
      title: 'Search ID Mappings',
      description:
        'Search ID mappings in the local store by PMID, PMCID, DOI, or Manuscript ID field.',
      inputSchema: {
        field: z.string().describe('Field to search (e.g., "pmid", "pmcid", "doi", "mid")'),
        value: z.string().describe('Value to search for (e.g., "12345678")'),
        limit: z.number().optional().default(20).describe('Maximum results (default: 20)'),
      },
    },
    async ({ field, value, limit }) => {
      const storage = getStorage();
      const results = await storage.searchRecords<Record<string, unknown>>('id-mappings', {
        field,
        value,
        limit,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No ID mappings matching ${field}="${value}" in store`,
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
