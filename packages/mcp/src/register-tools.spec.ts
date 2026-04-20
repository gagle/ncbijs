import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./tools/blast-tools', () => ({ registerBlastTools: vi.fn() }));
vi.mock('./tools/clinvar-tools', () => ({ registerClinVarTools: vi.fn() }));
vi.mock('./tools/datasets-tools', () => ({ registerDatasetsTools: vi.fn() }));
vi.mock('./tools/pmc-tools', () => ({ registerPmcTools: vi.fn() }));
vi.mock('./tools/pubchem-tools', () => ({ registerPubChemTools: vi.fn() }));
vi.mock('./tools/pubmed-tools', () => ({ registerPubmedTools: vi.fn() }));
vi.mock('./tools/pubtator-tools', () => ({ registerPubtatorTools: vi.fn() }));
vi.mock('./tools/snp-tools', () => ({ registerSnpTools: vi.fn() }));
vi.mock('./tools/utility-tools', () => ({ registerUtilityTools: vi.fn() }));

import { registerBlastTools } from './tools/blast-tools';
import { registerClinVarTools } from './tools/clinvar-tools';
import { registerDatasetsTools } from './tools/datasets-tools';
import { registerPmcTools } from './tools/pmc-tools';
import { registerPubChemTools } from './tools/pubchem-tools';
import { registerPubmedTools } from './tools/pubmed-tools';
import { registerPubtatorTools } from './tools/pubtator-tools';
import { registerSnpTools } from './tools/snp-tools';
import { registerUtilityTools } from './tools/utility-tools';
import type { ToolFactories } from './register-tools';
import { registerAllTools } from './register-tools';

describe('registerAllTools', () => {
  let mockServer: McpServer;
  let mockFactories: ToolFactories;

  beforeEach(() => {
    mockServer = {} as McpServer;
    mockFactories = {
      getPubmed: vi.fn(),
      getPmc: vi.fn(),
      getDatasets: vi.fn(),
      getBlast: vi.fn(),
      getSnp: vi.fn(),
      getClinVar: vi.fn(),
      getPubChem: vi.fn(),
    };
  });

  it('delegates to all nine register functions', () => {
    registerAllTools(mockServer, mockFactories);

    expect(registerPubmedTools).toHaveBeenCalledWith(mockServer, mockFactories.getPubmed);
    expect(registerPmcTools).toHaveBeenCalledWith(mockServer, mockFactories.getPmc);
    expect(registerPubtatorTools).toHaveBeenCalledWith(mockServer);
    expect(registerUtilityTools).toHaveBeenCalledWith(mockServer);
    expect(registerDatasetsTools).toHaveBeenCalledWith(mockServer, mockFactories.getDatasets);
    expect(registerBlastTools).toHaveBeenCalledWith(mockServer, mockFactories.getBlast);
    expect(registerSnpTools).toHaveBeenCalledWith(mockServer, mockFactories.getSnp);
    expect(registerClinVarTools).toHaveBeenCalledWith(mockServer, mockFactories.getClinVar);
    expect(registerPubChemTools).toHaveBeenCalledWith(mockServer, mockFactories.getPubChem);
  });
});
