import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { PubTator } from '@ncbijs/pubtator';
import { z } from 'zod';

/** Register PubTator3 entity recognition and annotation tools on the MCP server. */
export function registerPubtatorTools(server: McpServer): void {
  const pubtator = new PubTator();

  server.registerTool(
    'find-entity',
    {
      title: 'Find Biomedical Entity',
      description:
        'Search for biomedical entities (genes, diseases, chemicals, variants, species, cell lines) ' +
        'by name via PubTator3 autocomplete. Returns entity IDs and names.',
      inputSchema: {
        query: z.string().describe('Entity name or partial name to search'),
        entityType: z
          .enum(['gene', 'disease', 'chemical', 'variant', 'species', 'cell_line'])
          .optional()
          .describe('Filter by entity type'),
      },
    },
    async ({ query, entityType }) => {
      const matches = await pubtator.findEntity(query, entityType);

      return {
        content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
      };
    },
  );

  server.registerTool(
    'annotate-text',
    {
      title: 'Annotate Text with Biomedical Entities',
      description:
        'Annotate free text with biomedical named entity recognition via PubTator3. ' +
        'Identifies genes, diseases, chemicals, mutations, and species in the text.',
      inputSchema: {
        text: z.string().describe('Free text to annotate with entity recognition'),
        concept: z
          .enum(['Gene', 'Disease', 'Chemical', 'Mutation', 'Species', 'BioConcept'])
          .optional()
          .describe('Filter to a specific concept type'),
      },
    },
    async ({ text, concept }) => {
      const result = await pubtator.annotateText(text, concept ? { concept } : undefined);

      return {
        content: [{ type: 'text', text: result }],
      };
    },
  );

  server.registerTool(
    'export-annotations',
    {
      title: 'Export BioC Annotations',
      description:
        'Export BioC annotations for PubMed articles via PubTator3. Returns structured ' +
        'annotation data with entity types, positions, and identifiers.',
      inputSchema: {
        pmids: z.array(z.string()).min(1).max(100).describe('PubMed IDs to export annotations for'),
      },
    },
    async ({ pmids }) => {
      const bioc = await pubtator.export(pmids);

      return {
        content: [{ type: 'text', text: JSON.stringify(bioc, null, 2) }],
      };
    },
  );
}
