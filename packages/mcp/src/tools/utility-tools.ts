import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { cite } from '@ncbijs/cite';
import { convert } from '@ncbijs/id-converter';
import { MeSH } from '@ncbijs/mesh';
import { z } from 'zod';

export function registerUtilityTools(server: McpServer): void {
  server.registerTool(
    'convert-ids',
    {
      title: 'Convert Article IDs',
      description:
        'Convert between PubMed IDs (PMID), PubMed Central IDs (PMCID), DOIs, and Manuscript IDs (MID). ' +
        'Accepts up to 200 IDs per request.',
      inputSchema: {
        ids: z
          .array(z.string())
          .min(1)
          .max(200)
          .describe('Article IDs to convert (PMID, PMCID, or DOI)'),
      },
    },
    async ({ ids }) => {
      const converted = await convert(ids);

      return {
        content: [{ type: 'text', text: JSON.stringify(converted, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get-citation',
    {
      title: 'Get Citation',
      description:
        'Get a formatted citation for a PubMed article. Supports CSL-JSON (structured metadata), ' +
        'pre-rendered styles (APA, MLA, AMA, NLM), RIS, and MEDLINE formats.',
      inputSchema: {
        pmid: z.string().describe('PubMed ID of the article'),
        format: z
          .enum(['csl', 'citation', 'ris', 'medline'])
          .default('csl')
          .describe(
            'Citation format: csl (structured JSON), citation (APA/MLA/AMA/NLM), ris, or medline',
          ),
      },
    },
    async ({ pmid, format }) => {
      let text: string;

      switch (format) {
        case 'csl':
          text = JSON.stringify(await cite(pmid, 'csl'), null, 2);
          break;
        case 'citation':
          text = JSON.stringify(await cite(pmid, 'citation'), null, 2);
          break;
        case 'ris':
          text = await cite(pmid, 'ris');
          break;
        case 'medline':
          text = await cite(pmid, 'medline');
          break;
      }

      return {
        content: [{ type: 'text', text }],
      };
    },
  );

  const mesh = new MeSH({ descriptors: [] });

  server.registerTool(
    'mesh-lookup',
    {
      title: 'Look Up MeSH Term',
      description:
        'Look up a Medical Subject Headings (MeSH) descriptor by name or ID via the NLM API. ' +
        'Returns matching descriptor names and IDs.',
      inputSchema: {
        term: z.string().describe('MeSH descriptor name or partial name to look up'),
      },
    },
    async ({ term }) => {
      const results = await mesh.lookupOnline(term);

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.registerTool(
    'mesh-sparql',
    {
      title: 'MeSH SPARQL Query',
      description:
        'Execute a SPARQL query against the NLM MeSH vocabulary. Useful for advanced vocabulary ' +
        'traversal, finding related terms, and exploring the MeSH hierarchy.',
      inputSchema: {
        query: z.string().describe('SPARQL query to execute against the MeSH endpoint'),
      },
    },
    async ({ query }) => {
      const result = await mesh.sparql(query);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
