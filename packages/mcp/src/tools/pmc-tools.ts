import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PMC } from '@ncbijs/pmc';
import { pmcToChunks, pmcToMarkdown } from '@ncbijs/pmc';
import { z } from 'zod';

export function registerPmcTools(server: McpServer, getPmc: () => PMC): void {
  server.registerTool(
    'get-full-text',
    {
      title: 'Get PMC Full Text',
      description:
        'Fetch the full text of a PubMed Central article and return it as markdown. ' +
        'Requires a PMC ID (e.g., "PMC7886120" or "7886120").',
      inputSchema: {
        pmcid: z.string().describe('PubMed Central ID (e.g., "PMC7886120" or "7886120")'),
      },
    },
    async ({ pmcid }) => {
      const pmc = getPmc();
      const article = await pmc.fetch(pmcid);
      const markdown = pmcToMarkdown(article);

      return {
        content: [
          {
            type: 'text',
            text: `# ${pmcid}\nLicense: ${article.license || 'Not specified'}\n\n${markdown}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get-full-text-chunks',
    {
      title: 'Get PMC Full Text as Chunks',
      description:
        'Fetch a PubMed Central article and split it into semantic chunks suitable for ' +
        'RAG pipelines and embedding. Each chunk preserves section context.',
      inputSchema: {
        pmcid: z.string().describe('PubMed Central ID (e.g., "PMC7886120" or "7886120")'),
        maxTokens: z
          .number()
          .int()
          .min(64)
          .max(4096)
          .default(512)
          .describe('Maximum tokens per chunk'),
      },
    },
    async ({ pmcid, maxTokens }) => {
      const pmc = getPmc();
      const article = await pmc.fetch(pmcid);
      const chunks = pmcToChunks(article, { maxTokens });

      return {
        content: [{ type: 'text', text: JSON.stringify(chunks, null, 2) }],
      };
    },
  );
}
