import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GraphDatabase } from '../database.js';

export function registerBaseResources(
  server: McpServer,
  db: GraphDatabase
): void {
  server.registerResource(
    'knowledge-overview',
    'knowledge://overview',
    {
      description: 'VibeKnowledge 项目的实体/关系/观察记录总览',
      mimeType: 'application/json'
    },
    async () => {
      const overview = db.getOverview();
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


