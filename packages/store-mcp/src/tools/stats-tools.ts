import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';

/** Register storage stats tool on the MCP server. */
export function registerStatsTools(server: McpServer, getStorage: () => ReadableStorage): void {
  server.registerTool(
    'store-stats',
    {
      title: 'Store Statistics',
      description:
        'Get record counts and storage statistics for all datasets in the local store. ' +
        'Shows which datasets have been loaded and how many records each contains.',
      inputSchema: {},
    },
    async () => {
      const storage = getStorage();
      const stats = await storage.getStats();

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
      };
    },
  );
}
