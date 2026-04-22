import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ICite } from '@ncbijs/icite';
import { z } from 'zod';

/** Register iCite citation metrics tools on the MCP server. */
export function registerICiteTools(server: McpServer, getICite: () => ICite): void {
  server.registerTool(
    'citation-metrics',
    {
      title: 'Get Citation Metrics',
      description:
        'Get NIH iCite citation metrics for one or more PubMed articles. Returns Relative Citation Ratio (RCR), ' +
        'NIH percentile, citation counts, and research classification scores.',
      inputSchema: {
        pmids: z.array(z.number()).min(1).max(1000).describe('PubMed IDs to look up (max 1000)'),
      },
    },
    async ({ pmids }) => {
      const icite = getICite();
      const pubs = await icite.publications(pmids);
      return { content: [{ type: 'text' as const, text: JSON.stringify(pubs, null, 2) }] };
    },
  );

  server.registerTool(
    'citation-graph',
    {
      title: 'Get Citation Graph',
      description:
        'Get the full citation graph for a PubMed article — all articles that cite it (cited-by) ' +
        'or all articles it references, with full iCite metrics for each.',
      inputSchema: {
        pmid: z.number().describe('PubMed ID of the article'),
        direction: z
          .enum(['cited-by', 'references'])
          .describe('Direction: "cited-by" for citers, "references" for references'),
      },
    },
    async ({ pmid, direction }) => {
      const icite = getICite();
      const pubs =
        direction === 'cited-by' ? await icite.citedBy(pmid) : await icite.references(pmid);
      return { content: [{ type: 'text' as const, text: JSON.stringify(pubs, null, 2) }] };
    },
  );
}
