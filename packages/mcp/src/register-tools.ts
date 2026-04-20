import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PMC } from '@ncbijs/pmc';
import type { PubMed } from '@ncbijs/pubmed';

import { registerPmcTools } from './tools/pmc-tools.js';
import { registerPubmedTools } from './tools/pubmed-tools.js';
import { registerPubtatorTools } from './tools/pubtator-tools.js';
import { registerUtilityTools } from './tools/utility-tools.js';

export function registerAllTools(
  server: McpServer,
  getPubmed: () => PubMed,
  getPmc: () => PMC,
): void {
  registerPubmedTools(server, getPubmed);
  registerPmcTools(server, getPmc);
  registerPubtatorTools(server);
  registerUtilityTools(server);
}
