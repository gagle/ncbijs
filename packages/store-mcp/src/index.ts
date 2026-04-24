#!/usr/bin/env node

import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { DuckDbFileStorage } from '@ncbijs/store';
import type { ReadableStorage } from '@ncbijs/store';

import { registerAllTools } from './register-tools';

const SERVER_NAME = 'ncbijs-store';
const SERVER_VERSION = '0.0.1';

const dbPath = process.env['NCBIJS_DB_PATH'] ?? join(process.cwd(), 'data', 'ncbijs.duckdb');

let storage: ReadableStorage | undefined;

async function getStorage(): Promise<ReadableStorage> {
  if (storage === undefined) {
    storage = await DuckDbFileStorage.open(dbPath);
  }
  return storage;
}

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    instructions:
      'Local NCBI data query tools backed by a DuckDB store. Query MeSH descriptors, ' +
      'ClinVar variants, genes, taxonomy, PubChem compounds, and article ID mappings ' +
      'without API rate limits. Set NCBIJS_DB_PATH env var to point to your .duckdb file ' +
      '(default: data/ncbijs.duckdb in the current directory). ' +
      'Load data first using the ncbijs download and load scripts.',
  },
);

registerAllTools(server, () => {
  if (storage === undefined) {
    throw new Error(
      'Storage not initialized. The DuckDB connection opens asynchronously on first tool call.',
    );
  }
  return storage;
});

const transport = new StdioServerTransport();

await getStorage();
await server.connect(transport);
