import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PMC } from '@ncbijs/pmc';
import type { PubMed } from '@ncbijs/pubmed';

import { registerPmcTools } from './tools/pmc-tools';
import { registerPubmedTools } from './tools/pubmed-tools';
import { registerPubtatorTools } from './tools/pubtator-tools';
import { registerUtilityTools } from './tools/utility-tools';

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
