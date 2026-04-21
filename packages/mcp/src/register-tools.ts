import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Blast } from '@ncbijs/blast';
import type { ClinVar } from '@ncbijs/clinvar';
import type { Datasets } from '@ncbijs/datasets';
import type { PMC } from '@ncbijs/pmc';
import type { PubChem } from '@ncbijs/pubchem';
import type { PubMed } from '@ncbijs/pubmed';
import type { Snp } from '@ncbijs/snp';

import { registerBlastTools } from './tools/blast-tools';
import { registerClinVarTools } from './tools/clinvar-tools';
import { registerDatasetsTools } from './tools/datasets-tools';
import { registerPmcTools } from './tools/pmc-tools';
import { registerPubChemTools } from './tools/pubchem-tools';
import { registerPubmedTools } from './tools/pubmed-tools';
import { registerPubtatorTools } from './tools/pubtator-tools';
import { registerSnpTools } from './tools/snp-tools';
import { registerUtilityTools } from './tools/utility-tools';

/** Factory functions that lazily create NCBI client instances for MCP tools. */
export interface ToolFactories {
  readonly getPubmed: () => PubMed;
  readonly getPmc: () => PMC;
  readonly getDatasets: () => Datasets;
  readonly getBlast: () => Blast;
  readonly getSnp: () => Snp;
  readonly getClinVar: () => ClinVar;
  readonly getPubChem: () => PubChem;
}

/** Register all ncbijs tools on the given MCP server. */
export function registerAllTools(server: McpServer, factories: ToolFactories): void {
  registerPubmedTools(server, factories.getPubmed);
  registerPmcTools(server, factories.getPmc);
  registerPubtatorTools(server);
  registerUtilityTools(server);
  registerDatasetsTools(server, factories.getDatasets);
  registerBlastTools(server, factories.getBlast);
  registerSnpTools(server, factories.getSnp);
  registerClinVarTools(server, factories.getClinVar);
  registerPubChemTools(server, factories.getPubChem);
}
