import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./tools/clinvar-tools', () => ({ registerClinVarTools: vi.fn() }));
vi.mock('./tools/compound-tools', () => ({ registerCompoundTools: vi.fn() }));
vi.mock('./tools/gene-tools', () => ({ registerGeneTools: vi.fn() }));
vi.mock('./tools/id-mapping-tools', () => ({ registerIdMappingTools: vi.fn() }));
vi.mock('./tools/mesh-tools', () => ({ registerMeshTools: vi.fn() }));
vi.mock('./tools/stats-tools', () => ({ registerStatsTools: vi.fn() }));
vi.mock('./tools/taxonomy-tools', () => ({ registerTaxonomyTools: vi.fn() }));

import { registerClinVarTools } from './tools/clinvar-tools';
import { registerCompoundTools } from './tools/compound-tools';
import { registerGeneTools } from './tools/gene-tools';
import { registerIdMappingTools } from './tools/id-mapping-tools';
import { registerMeshTools } from './tools/mesh-tools';
import { registerStatsTools } from './tools/stats-tools';
import { registerTaxonomyTools } from './tools/taxonomy-tools';
import { registerAllTools } from './register-tools';

describe('registerAllTools', () => {
  let mockServer: McpServer;
  let getStorage: () => ReadableStorage;

  beforeEach(() => {
    mockServer = {} as McpServer;
    getStorage = vi.fn() as unknown as () => ReadableStorage;
  });

  it('delegates to all seven register functions', () => {
    registerAllTools(mockServer, getStorage);

    expect(registerMeshTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerClinVarTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerGeneTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerTaxonomyTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerCompoundTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerIdMappingTools).toHaveBeenCalledWith(mockServer, getStorage);
    expect(registerStatsTools).toHaveBeenCalledWith(mockServer, getStorage);
  });
});
