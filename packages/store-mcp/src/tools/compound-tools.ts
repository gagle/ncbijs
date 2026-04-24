import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { z } from 'zod';

/** Register compound query tools on the MCP server. */
export function registerCompoundTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-lookup-compound',
    {
      title: 'Look Up Compound',
      description:
        'Look up a PubChem compound by CID from the local store. ' +
        'Returns canonical SMILES, InChI key, IUPAC name, exact mass, and molecular weight.',
      inputSchema: {
        cid: z.string().describe('PubChem Compound ID (e.g., "2244" for Aspirin)'),
      },
    },
    async ({ cid }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('compounds', cid);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `Compound CID "${cid}" not found in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-compounds',
    {
      title: 'Search Compounds',
      description:
        'Search PubChem compounds in the local store by InChI key, IUPAC name, or SMILES.',
      inputSchema: {
        field: z
          .string()
          .describe('Field to search (e.g., "inchiKey", "iupacName", "canonicalSmiles")'),
        value: z.string().describe('Value to search for'),
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
      const results = await storage.searchRecords<Record<string, unknown>>('compounds', {
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
              text: `No compounds matching ${field}="${value}" in store`,
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
