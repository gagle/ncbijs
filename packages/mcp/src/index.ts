#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PMC } from '@ncbijs/pmc';
import { PubMed } from '@ncbijs/pubmed';

import { registerAllTools } from './register-tools.js';

const SERVER_NAME = 'ncbijs';
const SERVER_VERSION = '0.0.1';

const ncbiConfig = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-mcp',
  email: process.env['NCBI_EMAIL'] ?? 'ncbijs-mcp@users.noreply.github.com',
  apiKey: process.env['NCBI_API_KEY'],
};

let pubmed: PubMed | undefined;
let pmc: PMC | undefined;

function getPubmed(): PubMed {
  if (pubmed === undefined) {
    pubmed = new PubMed(ncbiConfig);
  }
  return pubmed;
}

function getPmc(): PMC {
  if (pmc === undefined) {
    pmc = new PMC(ncbiConfig);
  }
  return pmc;
}

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    instructions:
      'NCBI biomedical literature tools. Search PubMed (37M+ articles), fetch PMC full text, ' +
      'extract named entities via PubTator3, convert article IDs, get formatted citations, ' +
      'and query the MeSH vocabulary. Set NCBI_API_KEY env var for higher rate limits.',
  },
);

registerAllTools(server, getPubmed, getPmc);

const transport = new StdioServerTransport();
await server.connect(transport);
