import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PubChem } from '@ncbijs/pubchem';
import { z } from 'zod';

/** Register PubChem compound lookup tools on the MCP server. */
export function registerPubChemTools(server: McpServer, getPubChem: () => PubChem): void {
  server.registerTool(
    'search-compound',
    {
      title: 'Search PubChem Compound',
      description:
        'Look up a chemical compound in PubChem by name or CID. Returns molecular properties ' +
        '(formula, weight, SMILES, InChI), synonyms, and description.',
      inputSchema: {
        name: z.string().optional().describe('Compound name (e.g., "aspirin", "caffeine")'),
        cid: z.number().optional().describe('PubChem Compound ID (e.g., 2244 for aspirin)'),
      },
    },
    async ({ name, cid }) => {
      const pubchem = getPubChem();

      if (cid !== undefined) {
        const [properties, synonyms, description] = await Promise.all([
          pubchem.compoundByCid(cid),
          pubchem.synonyms(cid),
          pubchem.description(cid),
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  properties,
                  synonyms: synonyms.synonyms.slice(0, 20),
                  description: description.description,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      if (name !== undefined) {
        const properties = await pubchem.compoundByName(name);
        const [synonyms, description] = await Promise.all([
          pubchem.synonyms(properties.cid),
          pubchem.description(properties.cid),
        ]);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  properties,
                  synonyms: synonyms.synonyms.slice(0, 20),
                  description: description.description,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: 'Error: provide either name or cid' }],
        isError: true,
      };
    },
  );

  server.registerTool(
    'search-gene-by-compound',
    {
      title: 'Find Genes Linked to Compound',
      description:
        'Find NCBI Gene IDs linked to a PubChem compound by CID. ' +
        'Useful for identifying gene targets of a chemical compound.',
      inputSchema: {
        cid: z.number().describe('PubChem Compound ID'),
      },
    },
    async ({ cid }) => {
      const pubchem = getPubChem();
      const geneIds = await pubchem.geneByCid(cid);
      return { content: [{ type: 'text' as const, text: JSON.stringify(geneIds, null, 2) }] };
    },
  );
}
