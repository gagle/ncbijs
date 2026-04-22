import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Storage } from '@ncbijs/store';
import { z } from 'zod';

/** Register ClinVar variant query tools on the MCP server. */
export function registerClinVarTools(server: McpServer, getStorage: () => Storage): void {
  server.registerTool(
    'store-lookup-variant',
    {
      title: 'Look Up ClinVar Variant',
      description:
        'Look up a ClinVar variant by UID from the local store. ' +
        'Returns title, accession, clinical significance, genes, traits, and locations.',
      inputSchema: {
        uid: z.string().describe('ClinVar variant UID (e.g., "242587")'),
      },
    },
    async ({ uid }) => {
      const storage = getStorage();
      const record = await storage.getRecord<Record<string, unknown>>('clinvar', uid);

      if (record === undefined) {
        return {
          content: [{ type: 'text' as const, text: `ClinVar variant "${uid}" not found in store` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );

  server.registerTool(
    'store-search-variants',
    {
      title: 'Search ClinVar Variants',
      description:
        'Search ClinVar variants in the local store by clinical significance, ' +
        'title, or other fields.',
      inputSchema: {
        field: z
          .string()
          .describe('Field to search (e.g., "clinicalSignificance", "title", "accession")'),
        value: z.string().describe('Value to search for (e.g., "Pathogenic")'),
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
      const results = await storage.searchRecords<Record<string, unknown>>('clinvar', {
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
              text: `No ClinVar variants matching ${field}="${value}" in store`,
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
