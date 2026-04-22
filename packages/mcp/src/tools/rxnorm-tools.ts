import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { RxNorm } from '@ncbijs/rxnorm';
import { z } from 'zod';

/** Register RxNorm drug normalization tools on the MCP server. */
export function registerRxNormTools(server: McpServer, getRxNorm: () => RxNorm): void {
  server.registerTool(
    'drug-lookup',
    {
      title: 'Look Up Drug',
      description:
        'Look up a drug in RxNorm by name. Uses fuzzy matching to find the best candidates even with ' +
        'misspellings or partial names. Returns RxCUI identifiers, names, and match scores.',
      inputSchema: {
        name: z.string().describe('Drug name to look up (supports fuzzy matching)'),
        maxResults: z.number().optional().default(10).describe('Maximum results to return'),
      },
    },
    async ({ name, maxResults }) => {
      const rxnorm = getRxNorm();
      const candidates = await rxnorm.approximateTerm(name, { maxEntries: maxResults });
      return { content: [{ type: 'text' as const, text: JSON.stringify(candidates, null, 2) }] };
    },
  );

  server.registerTool(
    'drug-interaction',
    {
      title: 'Check Drug Interactions',
      description: 'Check known drug-drug interactions for an RxNorm concept by RxCUI.',
      inputSchema: {
        rxcui: z.string().describe('RxNorm Concept Unique Identifier'),
      },
    },
    async ({ rxcui }) => {
      const rxnorm = getRxNorm();
      const interactions = await rxnorm.interaction(rxcui);
      return { content: [{ type: 'text' as const, text: JSON.stringify(interactions, null, 2) }] };
    },
  );
}
