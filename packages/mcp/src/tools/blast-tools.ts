import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Blast } from '@ncbijs/blast';
import { z } from 'zod';

/** Register BLAST sequence alignment tools on the MCP server. */
export function registerBlastTools(server: McpServer, getBlast: () => Blast): void {
  server.registerTool(
    'blast-search',
    {
      title: 'BLAST Sequence Search',
      description:
        'Run a BLAST sequence alignment search against NCBI databases. Submits the query, ' +
        'polls for completion, and returns the results. Supports blastn, blastp, blastx, ' +
        'tblastn, tblastx, and megablast programs.',
      inputSchema: {
        query: z
          .string()
          .describe('Nucleotide or protein sequence in FASTA format, or an accession number'),
        program: z
          .enum(['blastn', 'blastp', 'blastx', 'tblastn', 'tblastx', 'megablast'])
          .describe('BLAST program to use'),
        database: z
          .string()
          .default('nt')
          .describe('Target database (nt, nr, swissprot, refseq_protein, etc.)'),
        expect: z.number().optional().describe('E-value threshold (default 10)'),
        hitlistSize: z
          .number()
          .optional()
          .describe('Maximum number of hits to return (default 50)'),
      },
    },
    async ({ query, program, database, expect, hitlistSize }) => {
      const blast = getBlast();
      const result = await blast.search(query, program, database, {
        ...(expect !== undefined && { expect }),
        ...(hitlistSize !== undefined && { hitlistSize }),
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
