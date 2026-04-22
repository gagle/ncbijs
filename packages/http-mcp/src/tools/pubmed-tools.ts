import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PubMed } from '@ncbijs/pubmed';
import { z } from 'zod';

/** Register PubMed search, related articles, references, and citation tools on the MCP server. */
export function registerPubmedTools(server: McpServer, getPubmed: () => PubMed): void {
  server.registerTool(
    'search-pubmed',
    {
      title: 'Search PubMed',
      description:
        'Search PubMed for biomedical literature articles. Returns structured metadata ' +
        'including title, abstract, authors, journal, MeSH terms, and publication date.',
      inputSchema: {
        query: z
          .string()
          .describe('PubMed search query (supports boolean operators and field tags)'),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(10)
          .describe('Maximum articles to return'),
        sort: z
          .enum(['relevance', 'pub_date', 'Author', 'JournalName'])
          .default('relevance')
          .describe('Sort order for results'),
        dateFrom: z.string().optional().describe('Start date filter (YYYY/MM/DD)'),
        dateTo: z.string().optional().describe('End date filter (YYYY/MM/DD)'),
      },
    },
    async ({ query, maxResults, sort, dateFrom, dateTo }) => {
      const pubmed = getPubmed();
      let builder = pubmed.search(query).sort(sort).limit(maxResults);

      if (dateFrom !== undefined && dateTo !== undefined) {
        builder = builder.dateRange(dateFrom, dateTo);
      }

      const articles = await builder.fetchAll();

      return {
        content: [{ type: 'text', text: JSON.stringify(articles, null, 2) }],
      };
    },
  );

  server.registerTool(
    'search-related',
    {
      title: 'Find Related Articles',
      description: 'Find PubMed articles related to a given article, ranked by relevancy score.',
      inputSchema: {
        pmid: z.string().describe('PubMed ID of the source article'),
      },
    },
    async ({ pmid }) => {
      const pubmed = getPubmed();
      const related = await pubmed.related(pmid);

      return {
        content: [{ type: 'text', text: JSON.stringify(related, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get-references',
    {
      title: 'Get Article References',
      description: 'Get the list of articles referenced by a given PubMed article.',
      inputSchema: {
        pmid: z.string().describe('PubMed ID of the article'),
      },
    },
    async ({ pmid }) => {
      const pubmed = getPubmed();
      const references = await pubmed.references(pmid);

      return {
        content: [{ type: 'text', text: JSON.stringify(references, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get-cited-by',
    {
      title: 'Get Citing Articles',
      description: 'Get the list of articles that cite a given PubMed article.',
      inputSchema: {
        pmid: z.string().describe('PubMed ID of the article'),
      },
    },
    async ({ pmid }) => {
      const pubmed = getPubmed();
      const citingArticles = await pubmed.citedBy(pmid);

      return {
        content: [{ type: 'text', text: JSON.stringify(citingArticles, null, 2) }],
      };
    },
  );
}
