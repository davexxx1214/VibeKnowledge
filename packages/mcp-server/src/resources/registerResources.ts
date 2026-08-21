import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GraphDatabase } from '../database.js';
import type { AgentGraphStore } from '../agentGraphStore.js';
import { getMergedOverview } from '../mergedGraph.js';

export function registerBaseResources(
  server: McpServer,
  db: GraphDatabase,
  agentGraph?: AgentGraphStore
): void {
  server.registerResource(
    'knowledge-overview',
    'knowledge://overview',
    {
      description: 'VibeKnowledge 手动图谱与 Agent 生成图谱的合并总览',
      mimeType: 'application/json'
    },
    async () => {
      const overview = agentGraph
        ? getMergedOverview(db, agentGraph)
        : db.getOverview();
      return {
        contents: [
          {
            uri: 'knowledge://overview',
            mimeType: 'application/json',
            text: JSON.stringify(overview, null, 2)
          }
        ]
      };
    }
  );
}


