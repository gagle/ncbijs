import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';

import { registerClinVarTools } from './tools/clinvar-tools';
import { registerCompoundTools } from './tools/compound-tools';
import { registerGeneTools } from './tools/gene-tools';
import { registerIdMappingTools } from './tools/id-mapping-tools';
import { registerMeshTools } from './tools/mesh-tools';
import { registerStatsTools } from './tools/stats-tools';
import { registerTaxonomyTools } from './tools/taxonomy-tools';

/** Register all store query tools on the given MCP server. */
export function registerAllTools(server: McpServer, getStorage: () => ReadableStorage): void {
  registerMeshTools(server, getStorage);
  registerClinVarTools(server, getStorage);
  registerGeneTools(server, getStorage);
  registerTaxonomyTools(server, getStorage);
  registerCompoundTools(server, getStorage);
  registerIdMappingTools(server, getStorage);
  registerStatsTools(server, getStorage);
}
